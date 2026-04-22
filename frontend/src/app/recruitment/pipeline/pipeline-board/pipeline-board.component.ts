import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Notyf } from 'notyf';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  CandidateApplicationRecord,
  RecruitmentStage,
  RecruitmentStageKey
} from '../../recruitment.models';
import { JobService } from '../../../services/job.service';

@Component({
  selector: 'app-pipeline-board',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './pipeline-board.component.html',
  styleUrl: './pipeline-board.component.css'
})
export class PipelineBoardComponent {
  notyf = new Notyf();
  isLoading = true;
  searchTerm = '';
  selectedStage = '';
  candidates: CandidateApplicationRecord[] = [];

  readonly processStages: RecruitmentStage[] = [
    { key: 'job_requirement', label: 'Job Requirement', description: 'Role created with interview rounds' },
    { key: 'posting', label: 'Job Posting', description: 'Job posted to channels and public link shared' },
    { key: 'candidate_applied', label: 'Candidate Applied', description: 'Candidate form submitted with resume' },
    { key: 'ats_screening', label: 'ATS Screening', description: 'ATS score and recruiter screening completed' },
    { key: 'shortlisted', label: 'Shortlisted', description: 'Candidate shortlisted for interview rounds' },
    { key: 'interview_scheduled', label: 'Interview Scheduled', description: 'Interviewers and slots assigned' },
    { key: 'interview_in_progress', label: 'Interview In Progress', description: 'Feedback captured round by round' },
    { key: 'offered', label: 'Offer', description: 'Offer / negotiation / BGV stage' },
    { key: 'closed', label: 'Closed', description: 'Joined, rejected, or dropped' }
  ];

  constructor(private jobService: JobService) {}

  ngOnInit() {
    this.loadPipeline();
  }

  get filteredCandidates(): CandidateApplicationRecord[] {
    const text = this.searchTerm.trim().toLowerCase();
    return this.candidates.filter((candidate) => {
      const stageMatch = !this.selectedStage || candidate.stage === this.selectedStage;
      const textMatch = !text || JSON.stringify(candidate).toLowerCase().includes(text);
      return stageMatch && textMatch;
    });
  }

  loadPipeline() {
    this.isLoading = true;
    this.jobService.getCandidatePipeline().pipe(
      catchError(() => of({ status: true, data: this.getMockCandidates() }))
    ).subscribe((response: any) => {
      this.candidates = (response?.data || []).map((item: CandidateApplicationRecord) => this.normalizeCandidate(item));
      this.isLoading = false;
    });
  }

  getStageLabel(stage: RecruitmentStageKey | string): string {
    return this.processStages.find((item) => item.key === stage)?.label || stage || '-';
  }

  getStageClass(stage: RecruitmentStageKey | string): string {
    switch (stage) {
      case 'candidate_applied':
        return 'stage-applied';
      case 'ats_screening':
        return 'stage-screening';
      case 'shortlisted':
        return 'stage-shortlisted';
      case 'interview_scheduled':
      case 'interview_in_progress':
        return 'stage-interview';
      case 'offered':
        return 'stage-offer';
      case 'closed':
        return 'stage-closed';
      default:
        return 'stage-default';
    }
  }

  getSkills(candidate: CandidateApplicationRecord): string[] {
    if (Array.isArray(candidate.skills)) {
      return candidate.skills;
    }

    if (typeof candidate.skills === 'string') {
      return candidate.skills.split(',').map((skill) => skill.trim()).filter(Boolean);
    }

    return [];
  }

  getFinalScore(candidate: CandidateApplicationRecord): number {
    return Number(candidate.ats?.final_score || 0);
  }

  saveScores(candidate: CandidateApplicationRecord) {
    const atsScore = Number(candidate.ats?.ats_score || 0);
    const manualScore = Number(candidate.ats?.manual_score || 0);
    candidate.ats = {
      ats_score: atsScore,
      manual_score: manualScore,
      final_score: Math.round((atsScore + manualScore) / 2),
      scanned_at: candidate.ats?.scanned_at,
      scanned_by: candidate.ats?.scanned_by,
      notes: candidate.ats?.notes || '',
      shortlisted: candidate.ats?.shortlisted || false
    };

    const payload = {
      application_id: candidate.id,
      ats_score: atsScore,
      manual_score: manualScore,
      notes: candidate.ats?.notes || '',
      shortlisted: candidate.ats?.shortlisted || false
    };

    this.jobService.saveCandidateAtsScore(payload).pipe(
      catchError(() => of({ status: true, message: 'Saved locally for UI flow' }))
    ).subscribe((response: any) => {
      if (response?.status === true) {
        candidate.stage = candidate.ats?.shortlisted ? 'shortlisted' : 'ats_screening';
        this.notyf.success(response?.message || 'ATS score updated');
        return;
      }

      this.notyf.error(response?.message || 'Unable to update ATS score');
    });
  }

  markShortlisted(candidate: CandidateApplicationRecord) {
    const atsScore = Number(candidate.ats?.ats_score || 0);
    const manualScore = Number(candidate.ats?.manual_score || 0);
    candidate.ats = {
      ats_score: atsScore,
      manual_score: manualScore,
      final_score: Number(candidate.ats?.final_score || Math.round((atsScore + manualScore) / 2)),
      scanned_at: candidate.ats?.scanned_at,
      scanned_by: candidate.ats?.scanned_by,
      notes: candidate.ats?.notes || '',
      shortlisted: true
    };

    this.jobService.updateCandidateStage({
      application_id: candidate.id,
      stage: 'shortlisted',
      status: 'shortlisted'
    }).pipe(
      catchError(() => of({ status: true, message: 'Shortlisted locally for UI flow' }))
    ).subscribe((response: any) => {
      if (response?.status === true) {
        candidate.stage = 'shortlisted';
        candidate.status = 'shortlisted';
        this.notyf.success(response?.message || 'Candidate shortlisted');
        return;
      }

      this.notyf.error(response?.message || 'Unable to shortlist candidate');
    });
  }

  getCompletedRounds(candidate: CandidateApplicationRecord): number {
    return (candidate.interview_rounds || []).filter((round) => round.status === 'completed').length;
  }

  private normalizeCandidate(candidate: CandidateApplicationRecord): CandidateApplicationRecord {
    const atsScore = Number(candidate.ats?.ats_score || 0);
    const manualScore = Number(candidate.ats?.manual_score || 0);
    const finalScore = Number(candidate.ats?.final_score || Math.round((atsScore + manualScore) / 2));

    return {
      ...candidate,
      stage: candidate.stage || 'candidate_applied',
      status: candidate.status || 'new',
      ats: {
        ats_score: atsScore,
        manual_score: manualScore,
        final_score: finalScore,
        shortlisted: candidate.ats?.shortlisted || false,
        notes: candidate.ats?.notes || ''
      },
      interview_rounds: candidate.interview_rounds || []
    };
  }

  private getMockCandidates(): CandidateApplicationRecord[] {
    return [
      {
        id: 'APP-1001',
        job_id: 'JOB-101',
        job_posting_id: 'POST-101',
        job_title: 'Angular Developer',
        department: 'Engineering',
        stage: 'ats_screening',
        status: 'screening',
        name: 'Riya Sharma',
        email: 'riya@example.com',
        phone: '9876543210',
        current_company: 'Apex Labs',
        experience: 4,
        current_ctc: 7.2,
        expected_ctc: 9,
        notice_period: 30,
        skills: ['Angular', 'RxJS', 'TypeScript'],
        resume_name: 'riya-sharma-resume.pdf',
        createdAt: new Date().toISOString(),
        ats: {
          ats_score: 82,
          manual_score: 78,
          final_score: 80,
          shortlisted: false
        },
        interview_rounds: [
          { round_id: 'R1', round_name: 'HR Screening', sequence: 1, status: 'pending' },
          { round_id: 'R2', round_name: 'Technical Interview', sequence: 2, status: 'pending' }
        ]
      },
      {
        id: 'APP-1002',
        job_id: 'JOB-102',
        job_posting_id: 'POST-102',
        job_title: 'Recruitment Executive',
        department: 'HR',
        stage: 'shortlisted',
        status: 'shortlisted',
        name: 'Arjun Verma',
        email: 'arjun@example.com',
        phone: '9123456780',
        current_company: 'PeopleNest',
        experience: 3,
        current_ctc: 5.1,
        expected_ctc: 6.2,
        notice_period: 15,
        skills: ['Sourcing', 'Screening', 'Interview Coordination'],
        resume_name: 'arjun-verma-resume.pdf',
        createdAt: new Date().toISOString(),
        ats: {
          ats_score: 88,
          manual_score: 91,
          final_score: 90,
          shortlisted: true
        },
        interview_rounds: [
          { round_id: 'R1', round_name: 'HR Screening', sequence: 1, status: 'completed', feedback_submitted: true },
          { round_id: 'R2', round_name: 'Managerial Round', sequence: 2, status: 'scheduled' }
        ]
      }
    ];
  }
}
