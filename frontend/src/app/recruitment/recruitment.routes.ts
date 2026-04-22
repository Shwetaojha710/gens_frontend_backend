import { Routes } from '@angular/router';
import { RecruitmentComponent } from './recruitment.component';
import { RecruitmentDesignationComponent } from './master/designation/designation.component';
import { RecruitmentDepartmentComponent } from './master/department/department.component';

export const recruitmentRoutes: Routes = [
  {
    path: '',
    component: RecruitmentComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'recruitment-dashboard' },
      {
        path: 'recruitment-dashboard',
        loadComponent: () =>
          import('./recuiter-dashboard/recuiter-dashboard.component').then((m) => m.RecuiterDashboardComponent),
      },
      {
        path: 'jobs/job-requirement',
        loadComponent: () =>
          import('./jobs/job-requirement/job-requirement.component').then((m) => m.JobRequirementComponent),
      },
      {
        path: 'jobs/posting-sourcing',
        loadComponent: () =>
          import('./jobs/posting-sourcing/posting-sourcing.component').then((m) => m.PostingSourcingComponent),
      },
      {
        path: 'application-list',
        loadComponent: () =>
          import('./application-list/application-list.component').then((m) => m.ApplicationListComponent),
      },
        //  { path: 'offered-candidate-list', component: OfferedCandidateListComponent },
      {
        path: 'offered-candidate-list',
        loadComponent: () =>
          import('./offered-candidate-list/offered-candidate-list.component').then((m) => m.OfferedCandidateListComponent),
      },
      {
        path: 'user',
        loadComponent: () =>
          import('./interview-pannel/user/user.component').then((m) => m.UserComponent),
      },
      {
        path: 'master/interview-round',
        loadComponent: () =>
          import('./master/interview-rounds/interview-rounds.component').then((m) => m.InterviewRoundsComponent),
      },

      {
        path: 'master/department',
        loadComponent: () =>
          import('./master/department/department.component').then((m) => m.RecruitmentDepartmentComponent),
      },
      {
        path: 'master/designation',
        loadComponent: () =>
          import('./master/designation/designation.component').then((m) => m.RecruitmentDesignationComponent),
      },
      {
        path: 'master/round-type',
        loadComponent: () =>
          import('./master/round-type/round-type.component').then((m) => m.RoundTypeComponent),
      },
          { path: 'department', component: RecruitmentDepartmentComponent },
          { path: 'designation', component: RecruitmentDesignationComponent },
      {
        path: 'offers/offer-letter',
        loadComponent: () =>
          import('./offers/offer-letter/offer-letter.component').then((m) => m.RecruitmentOfferLetterComponent),
      },
    ],
  },
];
