import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Notyf } from 'notyf';
import { InterviewerAssignedInterview, InterviewService } from '../../services/interview.service';
import { StatusService } from '../../services/status.service';

@Component({
  selector: 'app-interviewer-calendar-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './interviewer-calendar-page.component.html',
  styleUrl: './interviewer-calendar-page.component.css'
})
export class InterviewerCalendarPageComponent implements OnInit {
  loading = false;
  notyf = new Notyf();
  interviews: InterviewerAssignedInterview[] = [];

  constructor(
    private interviewService: InterviewService,
    private statusService: StatusService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.interviewService.getInterviewerWorkspace().subscribe({
      next: (workspace) => {
        const status = this.statusService.handleResponseStatus(workspace.status);
        if (status === true) {
          this.interviews = (workspace.interviews || [])
            .filter((item) => !!item.scheduled_at)
            .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
        } else if (status === 'expired') {
          this.router.navigate(['login']);
        }
        this.loading = false;
      },
      error: (err: any) => {
        this.loading = false;
        this.notyf.error(err?.error?.message || 'Failed to load calendar');
      }
    });
  }
}
