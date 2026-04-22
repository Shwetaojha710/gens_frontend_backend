import { Routes } from '@angular/router';
import { LayoutComponent } from './layout.component';
import { TrackingComponent } from '../tracking/tracking.component';
import { LiveTrackingComponent } from '../tracking/live-tracking/live-tracking.component';
import { AddComponent } from '../employee/add/add.component';
import { AppointmentLetterComponent } from '../employee/profile/appointment-letter/appointment-letter.component';
import { DocumentsComponent } from '../employee/profile/documents/documents.component';
import { NdaComponent } from '../employee/profile/nda/nda.component';
import { OfferLetterComponent } from '../employee/profile/offer-letter/offer-letter.component';
import { PersonalDetailsComponent } from '../employee/profile/personal-details/personal-details.component';
import { AssignLeaveComponent } from '../employee/profile/professional-info/assign-leave/assign-leave.component';
import { BankDetailsComponent } from '../employee/profile/professional-info/bank-details/bank-details.component';
import { ExperienceComponent } from '../employee/profile/professional-info/experience/experience.component';
import { QualificationComponent } from '../employee/profile/professional-info/qualification/qualification.component';
import { SkillsComponent } from '../employee/profile/professional-info/skills/skills.component';
import { SalaryStructureComponent } from '../employee/profile/salary-structure/salary-structure.component';
import { ServiceAgreementComponent } from '../employee/profile/service-agreement/service-agreement.component';
import { SalarySetupComponent } from '../payroll/salary-setup/salary-setup.component';

/**
 * HR app area under `/layout/*` (sidebar in {@link LayoutComponent}).
 * Paths mirror links in `navbar.component.ts`.
 */
export const layoutRoutes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () => import('../dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'employee/list',
        loadComponent: () => import('../employee/list/list.component').then((m) => m.ListComponent),
      },
      {
        path: 'employee/documents',
        loadComponent: () =>
          import('../employee/documents-overview/documents-overview.component').then(
            (m) => m.DocumentsOverviewComponent,
          ),
      },
      {
        path: 'employee/all-letters',
        loadComponent: () =>
          import('../employee/all-letters/all-letters.component').then(
            (m) => m.AllLettersComponent,
          ),
      },
      {
        path: 'employee/joining',
        loadComponent: () => import('../employee/joining/joining.component').then((m) => m.JoiningComponent),
      },
      {
        path: 'employee/add',
        component: AddComponent,
        children: [
          { path: 'profile/professional-info/qualification', component: QualificationComponent },
          { path: 'profile/professional-info/personal', component: PersonalDetailsComponent },
          { path: 'profile/professional-info/experience', component: ExperienceComponent },
          { path: 'profile/professional-info/skills', component: SkillsComponent },
          { path: 'profile/professional-info/salary', component: SalaryStructureComponent },
          { path: 'profile/professional-info/documents', component: DocumentsComponent },
          { path: 'profile/professional-info/bank-details', component: BankDetailsComponent },
          { path: 'profile/professional-info/assign-leave', component: AssignLeaveComponent },
          { path: 'profile/professional-info/salary-setup', component: SalarySetupComponent },
          { path: 'profile/professional-info/nda', component: NdaComponent },
          { path: 'profile/professional-info/service-agreement', component: ServiceAgreementComponent },
          { path: 'profile/professional-info/appointment-letter', component: AppointmentLetterComponent },
          { path: 'profile/professional-info/offer-letter', component: OfferLetterComponent },
        ],
      },
      {
        path: 'employee/apply-leave',
        loadComponent: () =>
          import('../employee/apply-leave/apply-leave.component').then((m) => m.ApplyLeaveComponent),
      },
      {
        path: 'attendance/shift',
        loadComponent: () =>
          import('../attendance/shift-master/shift-master.component').then((m) => m.ShiftMasterComponent),
      },
      {
        path: 'attendance/date-wise-attendance',
        loadComponent: () =>
          import('../attendance/date-wise-attendance/date-wise-attendance.component').then(
            (m) => m.DateWiseAttendanceComponent,
          ),
      },
      {
        path: 'attendance/holiday',
        loadComponent: () => import('../attendance/holiday/holiday.component').then((m) => m.HolidayComponent),
      },
      {
        path: 'attendance/logs',
        loadComponent: () => import('../attendance/logs/logs.component').then((m) => m.LogsComponent),
      },
      {
        path: 'attendance/leaves',
        loadComponent: () => import('../attendance/leaves/leaves.component').then((m) => m.LeavesComponent),
      },
      {
        path: 'attendance/upload-attendance',
        loadComponent: () =>
          import('../attendance/attendance-upload/attendance-upload.component').then(
            (m) => m.AttendanceUploadComponent,
          ),
      },
      {
        path: 'attendance/regularize',
        loadComponent: () =>
          import('../attendance/regularize/regularize.component').then((m) => m.RegularizeComponent),
      },
      {
        path: 'attendance/weekend-emp-list',
        loadComponent: () =>
          import('../attendance/weekend-emp-list/weekend-emp-list.component').then((m) => m.WeekendEmpListComponent),
      },
      {
        path: 'attendance/add-comp-off',
        loadComponent: () =>
          import('../attendance/add-comoff/add-comoff.component').then((m) => m.AddComoffComponent),
      },
      {
        path: 'attendance/salary-master',
        loadComponent: () =>
          import('../attendance/salary-master/salary-master.component').then((m) => m.SalaryMasterComponent),
      },
      {
        path: 'payroll/full-time',
        loadComponent: () =>
          import('../payroll/full-time-salary/full-time-salary.component').then((m) => m.FullTimeSalaryComponent),
      },
      {
        path: 'payroll/generated-salary',
        loadComponent: () =>
          import('../payroll/generated-salary/generated-salary.component').then((m) => m.GeneratedSalaryComponent),
      },
      {
        path: 'payroll/reimbursement',
        loadComponent: () =>
          import('../payroll/reimbursement/reimbursement.component').then((m) => m.ReimbursementComponent),
      },
      {
        path: 'reports/employee',
        loadComponent: () =>
          import('../reports/employee/employee.component').then((m) => m.EmployeeComponent),
      },
      {
        path: 'reports/payroll',
        loadComponent: () => import('../reports/payroll/payroll.component').then((m) => m.PayrollComponent),
      },
      {
        path: 'reports/attendance',
        loadComponent: () =>
          import('../reports/attendance/attendance.component').then((m) => m.AttendanceComponent),
      },
      {
        path: 'reports/tracking-report',
        loadComponent: () =>
          import('../reports/tracking-report/tracking-report.component').then((m) => m.TrackingReportComponent),
      },
        {
        path: 'tracking',
          loadComponent: () =>
          import('../../app/tracking/tracking.component').then((m) => m.TrackingComponent),

      },
        {
        path: 'tracking/live',
          loadComponent: () =>
          import('../../app/tracking/live-tracking/live-tracking.component').then((m) => m.LiveTrackingComponent),

      },
      // {
      //   path: 'tracking/live',
      //   component: LiveTrackingComponent
      // },
      {
        path: 'master/designation',
        loadComponent: () =>
          import('../master/designation/designation.component').then((m) => m.DesignationComponent),
      },
      {
        path: 'master/department',
        loadComponent: () =>
          import('../master/department/department.component').then((m) => m.DepartmentComponent),
      },
      {
        path: 'master/employment-type',
        loadComponent: () =>
          import('../master/employment-type/employment-type.component').then((m) => m.EmploymentTypeComponent),
      },
      {
        path: 'master/documents',
        loadComponent: () =>
          import('../master/document-type/document-type.component').then((m) => m.DocumentTypeComponent),
      },
      {
        path: 'master/holiday-type',
        loadComponent: () =>
          import('../master/holiday-type/holiday-type.component').then((m) => m.HolidayTypeComponent),
      },
      {
        path: 'master/salary-component',
        loadComponent: () =>
          import('../master/salary-component/salary-component.component').then((m) => m.SalaryComponentComponent),
      },
      {
        path: 'master/pay-slip',
        loadComponent: () =>
          import('../master/payslip-order/payslip-order.component').then((m) => m.PayslipOrderComponent),
      },
      {
        path: 'master/branch',
        loadComponent: () => import('../master/branch/branch.component').then((m) => m.BranchComponent),
      },
      {
        path: 'master/currency',
        loadComponent: () => import('../master/currency/currency.component').then((m) => m.CurrencyComponent),
      },
      {
        path: 'master/prefix',
        loadComponent: () => import('../master/preffix/preffix.component').then((m) => m.PreffixComponent),
      },
    ],
  },
];
