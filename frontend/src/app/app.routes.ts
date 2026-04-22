import { Routes } from '@angular/router';
import { AuthGuard } from './auth.guard';
import { SuperadminGuard } from './superadmin/superadmin.guard';
import { employeePortalGuard } from './employee-portal/employee-portal.guard';
import { CandidateRouteGuard } from './candidate-route.guard';
import { LandingPageComponent } from './landing-page/landing-page.component';
/**
 * Application routes — feature areas use `loadChildren` / `loadComponent` for lazy loading.
 */
export const routes: Routes = [
  { path: '', redirectTo: '/Home', pathMatch: 'full' },

  {
    path: 'Home',
    loadComponent: () =>
      import('./landing-page/landing-page.component').then((m) => m.LandingPageComponent),
  },
  {
    path: 'landing-home',
    loadComponent: () =>
      import('./landing-home/landing-home.component').then((m) => m.LandingHomeComponent),
  },
  {
    path: 'login',
    loadComponent: () => import('./login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'superadmin/login',
    loadComponent: () =>
      import('./superadmin/login/superadmin-login.component').then((m) => m.SuperadminLoginComponent),
  },
  {
    path: 'superadmin',
    canActivate: [SuperadminGuard],
    loadChildren: () => import('./superadmin/superadmin.routes').then((m) => m.superadminRoutes),
  },

  {
    path: 'privacy-policy',
    loadComponent: () =>
      import('./privacy-policy/privacy-policy.component').then((m) => m.PrivacyPolicyComponent),
  },
  {
    path: 'branchwise',
    loadComponent: () => import('./branchwise/branchwise.component').then((m) => m.BranchwiseComponent),
  },
  {
    path: 'pending-emp-list',
    loadComponent: () =>
      import('./pending-emp-list/pending-emp-list.component').then((m) => m.PendingEmpListComponent),
  },
  {
    path: 'company-reg',
    loadComponent: () => import('./company-reg/company-reg.component').then((m) => m.CompanyRegComponent),
  },
  {
    path: 'emp-profile',
    loadComponent: () => import('./emp-profile/emp-profile.component').then((m) => m.EmpProfileComponent),
  },
  {
    path: 'check-out',
    loadComponent: () => import('./checkout/checkout.component').then((m) => m.CheckoutComponent),
  },

  {
    path: 'layout',
    canActivate: [AuthGuard],
    loadChildren: () => import('./layout/layout.routes').then((m) => m.layoutRoutes),
  },

  {
    path: 'recruitment',
    loadChildren: () => import('./recruitment/recruitment.routes').then((m) => m.recruitmentRoutes),
  },
  {
    path: 'interview',
    loadChildren: () => import('./interviewer/interviewer.routes').then((m) => m.interviewerRoutes),
  },

  {
    path: 'employee-portal/login',
    loadComponent: () =>
      import('./employee-portal/login/employee-portal-login.component').then(
        (m) => m.EmployeePortalLoginComponent,
      ),
  },
  {
    path: 'employee-portal',
    canActivate: [employeePortalGuard],
    loadChildren: () =>
      import('./employee-portal/employee-portal.routes').then((m) => m.employeePortalRoutes),
  },

  {
    path: ':slug',
    canMatch: [CandidateRouteGuard],
    loadComponent: () =>
      import('./recruitment/candidate/candidate.component').then((m) => m.CandidateComponent),
  },

  {
    path: '**',
    loadComponent: () =>
      import('./page-not-found/page-not-found.component').then((m) => m.PageNotFoundComponent),
  },
];
