import { Routes } from '@angular/router';
import { RecruitmentComponent } from './recruitment.component';
import { RecruitmentDesignationComponent } from './master/designation/designation.component';
import { RecruitmentDepartmentComponent } from './master/department/department.component';
import { PermissionGuard } from '../permission.guard';

export const recruitmentRoutes: Routes = [
  {
    path: '',
    component: RecruitmentComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'recruitment-dashboard' },

      // ── Dashboard ──────────────────────────────────────────────────────────
      {
        path: 'recruitment-dashboard',
        canActivate: [PermissionGuard],
        data: { permKey: 'rec.dashboard' },
        loadComponent: () =>
          import('./recuiter-dashboard/recuiter-dashboard.component').then(
            (m) => m.RecuiterDashboardComponent,
          ),
      },

      // ── Recruitment Analysis ───────────────────────────────────────────────
      {
        path: 'jobs/job-requirement',
        canActivate: [PermissionGuard],
        data: { permKey: 'rec.analysis' },
        loadComponent: () =>
          import('./jobs/job-requirement/job-requirement.component').then(
            (m) => m.JobRequirementComponent,
          ),
      },
      {
        path: 'jobs/posting-sourcing',
        canActivate: [PermissionGuard],
        data: { permKey: 'rec.posting' },
        loadComponent: () =>
          import('./jobs/posting-sourcing/posting-sourcing.component').then(
            (m) => m.PostingSourcingComponent,
          ),
      },

      // ── Candidate Management ───────────────────────────────────────────────
      {
        path: 'application-list',
        canActivate: [PermissionGuard],
        data: { permKey: 'rec.candidates' },
        loadComponent: () =>
          import('./application-list/application-list.component').then(
            (m) => m.ApplicationListComponent,
          ),
      },
      {
        path: 'offered-candidate-list',
        canActivate: [PermissionGuard],
        data: { permKey: 'rec.offered' },
        loadComponent: () =>
          import('./offered-candidate-list/offered-candidate-list.component').then(
            (m) => m.OfferedCandidateListComponent,
          ),
      },
      {
        path: 'offers/offer-letter',
        canActivate: [PermissionGuard],
        data: { permKey: 'rec.offerletter' },
        loadComponent: () =>
          import('./offers/offer-letter/offer-letter.component').then(
            (m) => m.RecruitmentOfferLetterComponent,
          ),
      },

      // ── Interview Management ───────────────────────────────────────────────
      {
        path: 'user',
        canActivate: [PermissionGuard],
        data: { permKey: 'rec.user' },
        loadComponent: () =>
          import('./interview-pannel/user/user.component').then(
            (m) => m.UserComponent,
          ),
      },

      // ── Recruitment Master ─────────────────────────────────────────────────
      {
        path: 'master/interview-round',
        canActivate: [PermissionGuard],
        data: { permKey: 'rec.master.round' },
        loadComponent: () =>
          import('./master/interview-rounds/interview-rounds.component').then(
            (m) => m.InterviewRoundsComponent,
          ),
      },
      {
        path: 'master/round-type',
        canActivate: [PermissionGuard],
        data: { permKey: 'rec.master.roundtype' },
        loadComponent: () =>
          import('./master/round-type/round-type.component').then(
            (m) => m.RoundTypeComponent,
          ),
      },
      {
        path: 'master/department',
        canActivate: [PermissionGuard],
        data: { permKey: 'rec.master.department' },
        loadComponent: () =>
          import('./master/department/department.component').then(
            (m) => m.RecruitmentDepartmentComponent,
          ),
      },
      {
        path: 'master/designation',
        canActivate: [PermissionGuard],
        data: { permKey: 'rec.master.designation' },
        loadComponent: () =>
          import('./master/designation/designation.component').then(
            (m) => m.RecruitmentDesignationComponent,
          ),
      },

      // ── Legacy direct routes (kept for backward compat) ───────────────────
      { path: 'department',  component: RecruitmentDepartmentComponent },
      { path: 'designation', component: RecruitmentDesignationComponent },
    ],
  },
];
