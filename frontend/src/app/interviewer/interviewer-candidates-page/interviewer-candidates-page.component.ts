import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Notyf } from 'notyf';
import {
  InterviewerAssignedInterview,
  InterviewerSectionItem,
  InterviewService
} from '../../services/interview.service';
import { StatusService } from '../../services/status.service';
import { InterviewerCandidatesComponent } from '../interviewer-candidates/interviewer-candidates.component';

@Component({
  selector: 'app-interviewer-candidates-page',
  standalone: true,
  imports: [CommonModule, InterviewerCandidatesComponent],
  templateUrl: './interviewer-candidates-page.component.html',
  styleUrl: './interviewer-candidates-page.component.css'
})
export class InterviewerCandidatesPageComponent implements OnInit {
  loading = false;
  notyf = new Notyf();
  items: InterviewerSectionItem[] = [];
  allCandidates: InterviewerAssignedInterview[] = [];
  candidates: InterviewerAssignedInterview[] = [];
  currentFilter = 'all';

  constructor(
    private interviewService: InterviewService,
    private statusService: StatusService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      this.currentFilter = params.get('filter') || 'all';
      this.applyFilter();
    });
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.interviewService.getInterviewerWorkspace().subscribe({
      next: (workspace) => {
        const status = this.statusService.handleResponseStatus(workspace.status);
        if (status === true) {
          this.items = workspace.sections.find((section) => section.title === 'Candidates')?.items || [];
          this.allCandidates = this.getUniqueCandidates(workspace.interviews || []);
          this.applyFilter();
        } else if (status === 'expired') {
          this.router.navigate(['login']);
        }
        this.loading = false;
      },
      error: (err: any) => {
        this.loading = false;
        this.notyf.error(err?.error?.message || 'Failed to load candidates');
      }
    });
  }

  private applyFilter(): void {
    switch (this.currentFilter) {
      case 'shortlisted':
        this.candidates = this.allCandidates.filter((item) => item.recommendation !== 'rejected');
        break;
      case 'selected':
        this.candidates = this.allCandidates.filter((item) => item.recommendation === 'selected');
        break;
      case 'rejected':
        this.candidates = this.allCandidates.filter((item) => item.recommendation === 'rejected');
        break;
      default:
        this.candidates = [...this.allCandidates];
        break;
    }
  }

  private getUniqueCandidates(interviews: InterviewerAssignedInterview[]): InterviewerAssignedInterview[] {
    const seen = new Map<string, InterviewerAssignedInterview>();

    interviews.forEach((item) => {
      const key = item.application_id || item.candidate?.email || item.round_id;
      const existing = seen.get(key);

      if (!existing || this.getPriority(item) >= this.getPriority(existing)) {
        seen.set(key, item);
      }
    });

    return Array.from(seen.values());
  }

  private getPriority(item: InterviewerAssignedInterview): number {
    if (item.recommendation === 'selected') return 3;
    if (item.recommendation === 'rejected') return 2;
    if (item.feedback_submitted) return 1;
    return 0;
  }

  getCandidateStatusClass(item: InterviewerAssignedInterview): string {
    if (item.recommendation === 'selected') return 'bg-success';
    if (item.recommendation === 'rejected') return 'bg-danger';
    return 'bg-warning';
  }

  getCandidateStatusLabel(item: InterviewerAssignedInterview): string {
    return (item.recommendation || 'shortlisted')
      .replace('_', ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }
}
