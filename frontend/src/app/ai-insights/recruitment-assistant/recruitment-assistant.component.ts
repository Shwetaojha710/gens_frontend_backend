import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { NgSelectModule } from '@ng-select/ng-select';
import { Notyf } from 'notyf';
import { AiHrmsService } from '../../services/ai-hrms.service';
import { JobService } from '../../services/job.service';
import { formatAiSummary } from '../format-ai-summary';

@Component({
  selector: 'app-recruitment-assistant',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectModule],
  templateUrl: './recruitment-assistant.component.html',
  styleUrl: './recruitment-assistant.component.css',
})
export class RecruitmentAssistantComponent implements OnInit {
  private notyf = new Notyf();

  jobOptions: { id: string; label: string }[] = [];

  jobId: string | null = null;
  candidateId = '';
  selectedCandidateName: string | null = null;
  matchLoading = false;
  matchResult: any = null;
  questionsLoading = false;
  questionsResult: any = null;

  constructor(
    private aiHrms: AiHrmsService,
    private jobService: JobService,
    private sanitizer: DomSanitizer,
  ) {}

  ngOnInit(): void {
    this.loadJobs();
  }

  formatSummary(text: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(formatAiSummary(text));
  }

  hiringRecommendations(summary: string): string {
    if (!summary) return '';
    const idx = summary.search(/#{0,6}\s*hiring recommendations/i);
    if (idx === -1) return '';
    const rest = summary.slice(idx);
    return rest.replace(/^#{0,6}\s*hiring recommendations:?\s*\n?/i, '').trim();
  }

  pickCandidateForInterview(c: any): void {
    this.candidateId = c?.id || '';
    this.selectedCandidateName = c?.name || null;
    this.runInterviewQuestions();
    setTimeout(() => document.getElementById('ai-interview-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  }

  parseSkills(skills: string | string[] | null | undefined): string[] {
    if (!skills) return [];
    if (Array.isArray(skills)) return skills;
    try {
      const parsed = JSON.parse(skills);
      return Array.isArray(parsed) ? parsed : [skills];
    } catch {
      return skills.split(',').map((s) => s.trim()).filter(Boolean);
    }
  }

  sortedCandidates(): any[] {
    if (!Array.isArray(this.matchResult?.candidates)) return [];
    return [...this.matchResult.candidates].sort((a, b) => (b?.match_score ?? 0) - (a?.match_score ?? 0));
  }

  stageBadgeClass(stage: string): string {
    if (stage === 'offered' || stage === 'hired') return 'bg-label-success';
    if (stage === 'rejected') return 'bg-label-danger';
    if (stage === 'interview_scheduled' || stage === 'interview_in_progress') return 'bg-label-info';
    if (stage === 'shortlisted') return 'bg-label-primary';
    return 'bg-label-secondary';
  }

  private loadJobs(): void {
    this.jobService.getJobRequirements({}).subscribe({
      next: (res: any) => {
        if (Array.isArray(res?.data)) {
          this.jobOptions = res.data.map((item: any) => ({ id: item.id, label: item.job_title }));
        }
      },
      error: () => {},
    });
  }

  runMatch(): void {
    if (!this.jobId) {
      this.notyf.error('Select a job first');
      return;
    }
    this.matchLoading = true;
    this.matchResult = null;
    this.aiHrms.matchCandidates(this.jobId).subscribe({
      next: (res: any) => {
        this.matchResult = res;
        this.matchLoading = false;
      },
      error: (err) => {
        this.matchLoading = false;
        this.notyf.error(err?.error?.detail || 'Could not match candidates for this job');
      },
    });
  }

  runInterviewQuestions(): void {
    if (!this.jobId || !this.candidateId) {
      this.notyf.error('Select a job and enter a candidate id');
      return;
    }
    this.questionsLoading = true;
    this.questionsResult = null;
    this.aiHrms.getInterviewQuestions(this.jobId, this.candidateId).subscribe({
      next: (res: any) => {
        this.questionsResult = res;
        this.questionsLoading = false;
      },
      error: (err) => {
        this.questionsLoading = false;
        this.notyf.error(err?.error?.detail || 'Could not generate interview questions');
      },
    });
  }
}
