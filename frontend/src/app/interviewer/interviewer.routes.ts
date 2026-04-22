import { Routes } from '@angular/router';
import { InterviewerComponent } from './interviewer.component';

export const interviewerRoutes: Routes = [
  {
    path: '',
    component: InterviewerComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'interviewer-dashboard' },

      // Dashboard  →  /interview/interviewer-dashboard
      {
        path: 'interviewer-dashboard',
        loadComponent: () =>
          import('./interviewer-dashboard/interviewer-dashboard.component').then(
            (m) => m.InterviewerDashboardComponent,
          ),
      },

      // Interviews  →  /interview/interviews
      {
        path: 'interviews',
        loadComponent: () =>
          import('./interviewer-interviews-page/interviewer-interviews-page.component').then(
            (m) => m.InterviewerInterviewsPageComponent,
          ),
      },

      // Candidates  →  /interview/candidates
      {
        path: 'candidates',
        loadComponent: () =>
          import('./interviewer-candidates-page/interviewer-candidates-page.component').then(
            (m) => m.InterviewerCandidatesPageComponent,
          ),
      },

      // Feedback  →  /interview/feedback
      {
        path: 'feedback',
        loadComponent: () =>
          import('./interviewer-feedback-page/interviewer-feedback-page.component').then(
            (m) => m.InterviewerFeedbackPageComponent,
          ),
      },

      // Calendar  →  /interview/calendar
      {
        path: 'calendar',
        loadComponent: () =>
          import('./interviewer-calendar-page/interviewer-calendar-page.component').then(
            (m) => m.InterviewerCalendarPageComponent,
          ),
      },
    ],
  },
];
