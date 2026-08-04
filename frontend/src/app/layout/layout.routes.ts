import { Routes } from '@angular/router';
import { LayoutComponent } from './layout.component';
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
import { PermissionGuard } from '../permission.guard';

/**
 * HR app area under `/layout/*` (sidebar in {@link LayoutComponent}).
 * Every page is protected by PermissionGuard using the same permKey the
 * navbar uses — so sidebar-off ≡ route-blocked.
 */
export const layoutRoutes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },

      // ── Dashboard ──────────────────────────────────────────────────────────
      {
        path: 'dashboard',
        canActivate: [PermissionGuard],
        data: { permKey: 'dashboard' },
        loadComponent: () =>
          import('../dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },

      // ── Employee Management ────────────────────────────────────────────────
      {
        path: 'employee/list',
        canActivate: [PermissionGuard],
        data: { permKey: 'emp-mgmt' },
        loadComponent: () =>
          import('../employee/list/list.component').then((m) => m.ListComponent),
      },
      {
        path: 'employee/documents',
        canActivate: [PermissionGuard],
        data: { permKey: 'emp-mgmt' },
        loadComponent: () =>
          import('../employee/documents-overview/documents-overview.component').then(
            (m) => m.DocumentsOverviewComponent,
          ),
      },
      {
        path: 'employee/all-letters',
        canActivate: [PermissionGuard],
        data: { permKey: 'emp-mgmt.letters' },
        loadComponent: () =>
          import('../employee/all-letters/all-letters.component').then(
            (m) => m.AllLettersComponent,
          ),
      },
      {
        path: 'employee/joining',
        canActivate: [PermissionGuard],
        data: { permKey: 'emp-mgmt.add' },
        loadComponent: () =>
          import('../employee/joining/joining.component').then((m) => m.JoiningComponent),
      },
      {
        path: 'employee/add',
        canActivate: [PermissionGuard],
        data: { permKey: 'emp-mgmt.add' },
        component: AddComponent,
        children: [
          { path: 'profile/professional-info/qualification',    component: QualificationComponent },
          { path: 'profile/professional-info/personal',         component: PersonalDetailsComponent },
          { path: 'profile/professional-info/experience',       component: ExperienceComponent },
          { path: 'profile/professional-info/skills',           component: SkillsComponent },
          { path: 'profile/professional-info/salary',           component: SalaryStructureComponent },
          { path: 'profile/professional-info/documents',        component: DocumentsComponent },
          { path: 'profile/professional-info/bank-details',     component: BankDetailsComponent },
          { path: 'profile/professional-info/assign-leave',     component: AssignLeaveComponent },
          { path: 'profile/professional-info/salary-setup',     component: SalarySetupComponent },
          { path: 'profile/professional-info/nda',              component: NdaComponent },
          { path: 'profile/professional-info/service-agreement',component: ServiceAgreementComponent },
          { path: 'profile/professional-info/appointment-letter',component: AppointmentLetterComponent },
          { path: 'profile/professional-info/offer-letter',     component: OfferLetterComponent },
        ],
      },
      {
        path: 'employee/apply-leave',
        canActivate: [PermissionGuard],
        data: { permKey: 'emp-mgmt.leave' },
        loadComponent: () =>
          import('../employee/apply-leave/apply-leave.component').then((m) => m.ApplyLeaveComponent),
      },

      // ── Attendance & Shift ─────────────────────────────────────────────────
      {
        path: 'attendance/shift',
        canActivate: [PermissionGuard],
        data: { permKey: 'att.shift' },
        loadComponent: () =>
          import('../attendance/shift-master/shift-master.component').then((m) => m.ShiftMasterComponent),
      },
      {
        path: 'attendance/date-wise-attendance',
        canActivate: [PermissionGuard],
        data: { permKey: 'att.datewise' },
        loadComponent: () =>
          import('../attendance/date-wise-attendance/date-wise-attendance.component').then(
            (m) => m.DateWiseAttendanceComponent,
          ),
      },
      {
        path: 'attendance/holiday',
        canActivate: [PermissionGuard],
        data: { permKey: 'att.holiday' },
        loadComponent: () =>
          import('../attendance/holiday/holiday.component').then((m) => m.HolidayComponent),
      },
      {
        path: 'attendance/logs',
        canActivate: [PermissionGuard],
        data: { permKey: 'att.logs' },
        loadComponent: () =>
          import('../attendance/logs/logs.component').then((m) => m.LogsComponent),
      },
      {
        path: 'attendance/leaves',
        canActivate: [PermissionGuard],
        data: { permKey: 'att.leaves' },
        loadComponent: () =>
          import('../attendance/leaves/leaves.component').then((m) => m.LeavesComponent),
      },
      {
        path: 'attendance/upload-attendance',
        canActivate: [PermissionGuard],
        data: { permKey: 'att.upload' },
        loadComponent: () =>
          import('../attendance/attendance-upload/attendance-upload.component').then(
            (m) => m.AttendanceUploadComponent,
          ),
      },
      {
        path: 'attendance/regularize',
        canActivate: [PermissionGuard],
        data: { permKey: 'att.regularize' },
        loadComponent: () =>
          import('../attendance/regularize/regularize.component').then((m) => m.RegularizeComponent),
      },
      {
        path: 'attendance/weekend-emp-list',
        canActivate: [PermissionGuard],
        data: { permKey: 'att.weekend' },
        loadComponent: () =>
          import('../attendance/weekend-emp-list/weekend-emp-list.component').then(
            (m) => m.WeekendEmpListComponent,
          ),
      },
      {
        path: 'attendance/add-comp-off',
        canActivate: [PermissionGuard],
        data: { permKey: 'att.compoff' },
        loadComponent: () =>
          import('../attendance/add-comoff/add-comoff.component').then((m) => m.AddComoffComponent),
      },
      {
        path: 'attendance/contractual-approval',
        canActivate: [PermissionGuard],
        data: { permKey: 'att.contractual' },
        loadComponent: () =>
          import('../attendance/contractual-approval/contractual-approval.component').then(
            (m) => m.ContractualApprovalComponent,
          ),
      },
      {
        path: 'attendance/salary-master',
        canActivate: [PermissionGuard],
        data: { permKey: 'set.attmaster' },
        loadComponent: () =>
          import('../attendance/salary-master/salary-master.component').then(
            (m) => m.SalaryMasterComponent,
          ),
      },

      // ── Payroll & Compensation ─────────────────────────────────────────────
      {
        path: 'payroll/full-time',
        canActivate: [PermissionGuard],
        data: { permKey: 'pay.generate' },
        loadComponent: () =>
          import('../payroll/full-time-salary/full-time-salary.component').then(
            (m) => m.FullTimeSalaryComponent,
          ),
      },
      {
        path: 'payroll/generated-salary',
        canActivate: [PermissionGuard],
        data: { permKey: 'pay.list' },
        loadComponent: () =>
          import('../payroll/generated-salary/generated-salary.component').then(
            (m) => m.GeneratedSalaryComponent,
          ),
      },
      {
        path: 'payroll/deduction-summary',
        canActivate: [PermissionGuard],
        data: { permKey: 'pay.deduction' },
        loadComponent: () =>
          import('../payroll/salary-deduction-summary/salary-deduction-summary.component').then(
            (m) => m.SalaryDeductionSummaryComponent,
          ),
      },
      {
        path: 'payroll/reimbursement',
        canActivate: [PermissionGuard],
        data: { permKey: 'pay.reimburse' },
        loadComponent: () =>
          import('../payroll/reimbursement/reimbursement.component').then(
            (m) => m.ReimbursementComponent,
          ),
      },
      {
        path: 'payroll/employee-appraisal',
        canActivate: [PermissionGuard],
        data: { permKey: 'pay.appraisal' },
        loadComponent: () =>
          import('../payroll/employee-appraisal/employee-appraisal.component').then(
            (m) => m.EmployeeAppraisalComponent,
          ),
      },

      // ── Reports ───────────────────────────────────────────────────────────
      {
        path: 'reports/employee',
        canActivate: [PermissionGuard],
        data: { permKey: 'rep.employee' },
        loadComponent: () =>
          import('../reports/employee/employee.component').then((m) => m.EmployeeComponent),
      },
      {
        path: 'reports/payroll',
        canActivate: [PermissionGuard],
        data: { permKey: 'rep.payroll' },
        loadComponent: () =>
          import('../reports/payroll/payroll.component').then((m) => m.PayrollComponent),
      },
      {
        path: 'reports/salary-register',
        canActivate: [PermissionGuard],
        data: { permKey: 'rep.salaryRegister' },
        loadComponent: () =>
          import('../reports/salary-register/salary-register.component').then(
            (m) => m.SalaryRegisterComponent,
          ),
      },
      {
        path: 'reports/attendance',
        canActivate: [PermissionGuard],
        data: { permKey: 'rep.late' },
        loadComponent: () =>
          import('../reports/attendance/attendance.component').then((m) => m.AttendanceComponent),
      },
      {
        path: 'reports/tracking-report',
        canActivate: [PermissionGuard],
        data: { permKey: 'rep.tracking' },
        loadComponent: () =>
          import('../reports/tracking-report/tracking-report.component').then(
            (m) => m.TrackingReportComponent,
          ),
      },

      // ── AI Insights ───────────────────────────────────────────────────────
      {
        path: 'ai-insights/attendance',
        canActivate: [PermissionGuard],
        data: { permKey: 'ai.attendance' },
        loadComponent: () =>
          import('../ai-insights/attendance-analytics/attendance-analytics.component').then(
            (m) => m.AttendanceAnalyticsComponent,
          ),
      },
      {
        path: 'ai-insights/payroll',
        canActivate: [PermissionGuard],
        data: { permKey: 'ai.payroll' },
        loadComponent: () =>
          import('../ai-insights/payroll-verification/payroll-verification.component').then(
            (m) => m.PayrollVerificationComponent,
          ),
      },
      {
        path: 'ai-insights/leave',
        canActivate: [PermissionGuard],
        data: { permKey: 'ai.leave' },
        loadComponent: () =>
          import('../ai-insights/leave-recommendations/leave-recommendations.component').then(
            (m) => m.LeaveRecommendationsComponent,
          ),
      },
      {
        path: 'ai-insights/performance',
        canActivate: [PermissionGuard],
        data: { permKey: 'ai.performance' },
        loadComponent: () =>
          import('../ai-insights/performance-insights/performance-insights.component').then(
            (m) => m.PerformanceInsightsComponent,
          ),
      },
      {
        path: 'ai-insights/attrition',
        canActivate: [PermissionGuard],
        data: { permKey: 'ai.attrition' },
        loadComponent: () =>
          import('../ai-insights/attrition-prediction/attrition-prediction.component').then(
            (m) => m.AttritionPredictionComponent,
          ),
      },
      {
        path: 'ai-insights/recruitment',
        canActivate: [PermissionGuard],
        data: { permKey: 'ai.recruitment' },
        loadComponent: () =>
          import('../ai-insights/recruitment-assistant/recruitment-assistant.component').then(
            (m) => m.RecruitmentAssistantComponent,
          ),
      },

      // ── Tracking (no permission restriction) ──────────────────────────────
      {
        path: 'tracking',
        loadComponent: () =>
          import('../../app/tracking/tracking.component').then((m) => m.TrackingComponent),
      },
      {
        path: 'tracking/live',
        loadComponent: () =>
          import('../../app/tracking/live-tracking/live-tracking.component').then(
            (m) => m.LiveTrackingComponent,
          ),
      },

      // ── Master ────────────────────────────────────────────────────────────
      {
        path: 'master/designation',
        canActivate: [PermissionGuard],
        data: { permKey: 'master.designation' },
        loadComponent: () =>
          import('../master/designation/designation.component').then((m) => m.DesignationComponent),
      },
      {
        path: 'master/department',
        canActivate: [PermissionGuard],
        data: { permKey: 'master.department' },
        loadComponent: () =>
          import('../master/department/department.component').then((m) => m.DepartmentComponent),
      },
      {
        path: 'master/employment-type',
        canActivate: [PermissionGuard],
        data: { permKey: 'master.emptype' },
        loadComponent: () =>
          import('../master/employment-type/employment-type.component').then(
            (m) => m.EmploymentTypeComponent,
          ),
      },
      {
        path: 'master/documents',
        canActivate: [PermissionGuard],
        data: { permKey: 'master.docs' },
        loadComponent: () =>
          import('../master/document-type/document-type.component').then(
            (m) => m.DocumentTypeComponent,
          ),
      },
      {
        path: 'master/holiday-type',
        canActivate: [PermissionGuard],
        data: { permKey: 'master.holidaytype' },
        loadComponent: () =>
          import('../master/holiday-type/holiday-type.component').then(
            (m) => m.HolidayTypeComponent,
          ),
      },
      {
        path: 'master/salary-component',
        canActivate: [PermissionGuard],
        data: { permKey: 'master.salary' },
        loadComponent: () =>
          import('../master/salary-component/salary-component.component').then(
            (m) => m.SalaryComponentComponent,
          ),
      },
      {
        path: 'master/pay-slip',
        canActivate: [PermissionGuard],
        data: { permKey: 'master.payslip' },
        loadComponent: () =>
          import('../master/payslip-order/payslip-order.component').then(
            (m) => m.PayslipOrderComponent,
          ),
      },
      {
        path: 'master/branch',
        canActivate: [PermissionGuard],
        data: { permKey: 'master.branch' },
        loadComponent: () =>
          import('../master/branch/branch.component').then((m) => m.BranchComponent),
      },

      // ── Setting ───────────────────────────────────────────────────────────
      {
        path: 'master/currency',
        canActivate: [PermissionGuard],
        data: { permKey: 'set.currency' },
        loadComponent: () =>
          import('../master/currency/currency.component').then((m) => m.CurrencyComponent),
      },
      {
        path: 'master/prefix',
        canActivate: [PermissionGuard],
        data: { permKey: 'set.prefix' },
        loadComponent: () =>
          import('../master/preffix/preffix.component').then((m) => m.PreffixComponent),
      },
      {
        path: 'master/brand-colors',
        canActivate: [PermissionGuard],
        data: { permKey: 'set.brand' },
        loadComponent: () =>
          import('../master/brand-colors/brand-colors.component').then(
            (m) => m.BrandColorsComponent,
          ),
      },
      {
        path: 'master/letterhead',
        canActivate: [PermissionGuard],
        data: { permKey: 'set.brand' },
        loadComponent: () =>
          import('../master/letterhead/letterhead.component').then(
            (m) => m.LetterheadComponent,
          ),
      },
      {
        path: 'master/handbook',
        canActivate: [PermissionGuard],
        data: { permKey: 'set.handbook' },
        loadComponent: () =>
          import('../master/handbook/handbook.component').then(
            (m) => m.HandbookComponent,
          ),
      },
      {
        path: 'master/role-permission',
        canActivate: [PermissionGuard],
        data: { permKey: 'set.roleperm' },
        loadComponent: () =>
          import('../master/role-permission/role-permission.component').then(
            (m) => m.RolePermissionComponent,
          ),
      },
      {
        path: 'master/user-permission',
        canActivate: [PermissionGuard],
        data: { permKey: 'set.userperm' },
        loadComponent: () =>
          import('../master/user-permission/user-permission.component').then(
            (m) => m.UserPermissionComponent,
          ),
      },
      {
        path: 'master/user-access',
        canActivate: [PermissionGuard],
        data: { permKey: 'set.sidebaraccess' },
        loadComponent: () =>
          import('../master/user-access/user-access.component').then(
            (m) => m.UserAccessComponent,
          ),
      },
    ],
  },
];
