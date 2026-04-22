import { Routes } from '@angular/router';
import { SuperadminLayoutComponent } from './layout/superadmin-layout.component';

export const superadminRoutes: Routes = [
  {
    path: '',
    component: SuperadminLayoutComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./dashboard/superadmin-dashboard.component').then((m) => m.SuperadminDashboardComponent),
      },
      {
        path: 'companies/:companyId/dashboard',
        loadComponent: () =>
          import('./company-dashboard/superadmin-company-dashboard.component').then(
            (m) => m.SuperadminCompanyDashboardComponent,
          ),
      },
      {
        path: 'companies',
        loadComponent: () =>
          import('./companies/superadmin-companies.component').then((m) => m.SuperadminCompaniesComponent),
      },
      {
        path: 'plans',
        loadComponent: () => import('./plans/superadmin-plans.component').then((m) => m.SuperadminPlansComponent),
      },
      {
        path: 'landing',
        loadComponent: () =>
          import('./landing/superadmin-landing.component').then((m) => m.SuperadminLandingComponent),
      },
      {
        path: 'contact-inquiries',
        loadComponent: () =>
          import('./contact-inquiries/superadmin-contact-inquiries.component').then(
            (m) => m.SuperadminContactInquiriesComponent,
          ),
      },
      {
        path: 'users',
        loadComponent: () => import('./users/superadmin-users.component').then((m) => m.SuperadminUsersComponent),
      },
    ],
  },
];
