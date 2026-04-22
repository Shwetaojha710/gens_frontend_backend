import { Routes } from '@angular/router';
import { EmployeePortalLayoutComponent } from './employee-portal-layout.component';

/** Child routes render inside `<router-outlet>` in the portal shell. */
export const employeePortalRoutes: Routes = [
  {
    path: '',
    component: EmployeePortalLayoutComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./dashboard/employee-portal-dashboard.component').then((m) => m.EmployeePortalDashboardComponent),
      },
      {
        path: 'attendance',
        loadComponent: () =>
          import('./attendance/employee-portal-attendance.component').then((m) => m.EmployeePortalAttendanceComponent),
      },
      {
        path: 'leave',
        loadComponent: () =>
          import('./leave/employee-portal-leave.component').then((m) => m.EmployeePortalLeaveComponent),
      },
      {
        path: 'salary',
        loadComponent: () =>
          import('./salary/employee-portal-salary.component').then((m) => m.EmployeePortalSalaryComponent),
      },
      {
        path: 'holidays',
        loadComponent: () =>
          import('./holidays/employee-portal-holidays.component').then((m) => m.EmployeePortalHolidaysComponent),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./profile/employee-portal-profile.component').then((m) => m.EmployeePortalProfileComponent),
      },
      {
        path: 'reports',
        loadComponent: () =>
          import('./reports/employee-portal-reports.component').then((m) => m.EmployeePortalReportsComponent),
      },
      {
        path: 'regularization',
        loadComponent: () =>
          import('./regularization/employee-portal-regularization.component').then(
            (m) => m.EmployeePortalRegularizationComponent,
          ),
      },
      {
        path: 'reimbursement',
        loadComponent: () =>
          import('./reimbursement/employee-portal-reimbursement.component').then(
            (m) => m.EmployeePortalReimbursementComponent,
          ),
      },
      {
        path: 'documents',
        loadComponent: () =>
          import('./documents/employee-portal-documents.component').then(
            (m) => m.EmployeePortalDocumentsComponent,
          ),
      },
    ],
  },
];
