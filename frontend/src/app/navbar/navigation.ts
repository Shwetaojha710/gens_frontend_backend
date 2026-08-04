// menu.model.ts

export type UserRole =
  | 'admin'
  | 'superadmin'
  | 'hr'
  | 'manager'
  | 'director'
  | 'recruiter'
  | 'employee';

export interface MenuItem {
  [x: string]: any;
  title: string;
  icon: string;
  link?: any;
  active?: boolean;
  open?: boolean;
  target?: string;
  children?: MenuItem[];
  routeLink?: any[];
  /** Roles that can see this item. Omit (undefined) = visible to all roles. */
  roles?: UserRole[];
  /** PermissionService key — when set, visibility is controlled by the Role Permission page. */
  permKey?: string;
  /** Optional query params passed to [queryParams] on the routerLink. */
  queryParams?: { [key: string]: string };
  /** Set to true when children are loaded lazily (prevents empty-children filter). */
  lazyChildren?: boolean;
}

// ── Single source of truth for the app's menu tree ───────────────────────
// Used by NavbarComponent (sidebar) and HeaderComponent (global search).
export const APP_MENU_ITEMS: MenuItem[] = [
  {
    title: 'Dashboards',
    icon: 'ri-home-smile-line',
    active: true,
    link: '/layout/dashboard',
    permKey: 'dashboard',
  },
  {
    title: 'Employee Management',
    icon: 'ri-layout-2-line',
    permKey: 'emp-mgmt',
    children: [
      { title: 'Add Employee',  icon: 'ri-user-add-line',     link: '/layout/employee/joining',     permKey: 'emp-mgmt.add' },
      { title: 'Apply Leave',   icon: 'ri-file-list-2-line',  link: '/layout/employee/apply-leave', permKey: 'emp-mgmt.leave' },
      { title: 'All Letters',   icon: 'ri-file-paper-2-line', link: '/layout/employee/all-letters', permKey: 'emp-mgmt.letters' },
    ]
  },
  {
    title: 'Attendance & Shift',
    icon: 'ri-calendar-check-line',
    permKey: 'attendance',
    children: [
      { title: 'Shift Master',            icon: 'ri-user-3-line',          link: '/layout/attendance/shift',                permKey: 'att.shift' },
      { title: 'Date Wise Attendance',    icon: 'ri-calendar-line',        link: '/layout/attendance/date-wise-attendance', permKey: 'att.datewise' },
      { title: 'Holiday',                 icon: 'ri-barricade-fill',       link: '/layout/attendance/holiday',              permKey: 'att.holiday' },
      { title: 'Attendance Logs',         icon: 'ri-calendar-line',        link: '/layout/attendance/logs',                 permKey: 'att.logs' },
      { title: 'Leaves',                  icon: 'ri-leaf-line',            link: '/layout/attendance/leaves',               permKey: 'att.leaves' },
      { title: 'Upload Attendance',       icon: 'ri-upload-cloud-line',    link: '/layout/attendance/upload-attendance',    permKey: 'att.upload' },
      { title: 'Regularize',              icon: 'ri-upload-cloud-line',    link: '/layout/attendance/regularize',           permKey: 'att.regularize' },
      { title: 'Weekend Employee List',   icon: 'ri-upload-cloud-line',    link: '/layout/attendance/weekend-emp-list',     permKey: 'att.weekend' },
      { title: 'Add Comp Off',            icon: 'ri-upload-cloud-line',    link: '/layout/attendance/add-comp-off',         permKey: 'att.compoff' },
      { title: 'Contractual Approval',    icon: 'ri-checkbox-circle-line', link: '/layout/attendance/contractual-approval', permKey: 'att.contractual' },
    ]
  },
  {
    title: 'Payroll & Compensation',
    icon: 'ri-money-cny-circle-line',
    permKey: 'payroll',
    children: [
      { title: 'Generate Salary',       icon: 'ri-money-rupee-circle-line', link: '/layout/payroll/full-time',         permKey: 'pay.generate' },
      { title: 'Generated Salary List', icon: 'ri-suitcase-line',           link: '/layout/payroll/generated-salary',  permKey: 'pay.list' },
      { title: 'Deduction Summary',     icon: 'ri-subtract-line',           link: '/layout/payroll/deduction-summary', permKey: 'pay.deduction' },
      { title: 'Reimbursement',         icon: 'ri-refund-line',             link: '/layout/payroll/reimbursement',     permKey: 'pay.reimburse' },
      { title: 'Employee Appraisal',    icon: 'ri-percent-line',            link: '/layout/payroll/employee-appraisal', permKey: 'pay.appraisal' },
    ]
  },
  {
    title: 'Reports',
    icon: 'ri-bar-chart-line',
    permKey: 'reports',
    children: [
      { title: 'Employee Report',     icon: 'ri-file-user-line',   link: '/layout/reports/employee',         permKey: 'rep.employee' },
      { title: 'Payroll Report',      icon: 'ri-file-paper-line',  link: '/layout/reports/payroll',          permKey: 'rep.payroll' },
      { title: 'Salary Register',     icon: 'ri-file-list-3-line', link: '/layout/reports/salary-register',  permKey: 'rep.salaryRegister' },
      { title: 'Late Arrival Report', icon: 'ri-file-list-3-line', link: '/layout/reports/attendance',       permKey: 'rep.late' },
      { title: 'Tracking Report',     icon: 'ri-file-list-3-line', link: '/layout/reports/tracking-report',  permKey: 'rep.tracking' },
    ]
  },
  {
    title: 'AI Insights',
    icon: 'ri-brain-line',
    permKey: 'ai-insights',
    children: [
      { title: 'Attendance Analytics',  icon: 'ri-calendar-check-line',      link: '/layout/ai-insights/attendance',  permKey: 'ai.attendance' },
      { title: 'Payroll Verification',  icon: 'ri-money-rupee-circle-line', link: '/layout/ai-insights/payroll',     permKey: 'ai.payroll' },
      { title: 'Leave Recommendations', icon: 'ri-file-list-2-line',        link: '/layout/ai-insights/leave',       permKey: 'ai.leave' },
      { title: 'Performance Insights',  icon: 'ri-line-chart-line',         link: '/layout/ai-insights/performance', permKey: 'ai.performance' },
      { title: 'Attrition Prediction',  icon: 'ri-user-unfollow-line',      link: '/layout/ai-insights/attrition',   permKey: 'ai.attrition' },
      { title: 'Recruitment Assistant', icon: 'ri-briefcase-line',          link: '/layout/ai-insights/recruitment', permKey: 'ai.recruitment' },
    ],
  },
  {
    title: 'Master',
    icon: 'ri-settings-3-line',
    permKey: 'master',
    children: [
      { title: 'Designation Master', icon: 'ri-team-line',        link: '/layout/master/designation',      permKey: 'master.designation' },
      { title: 'Department Master',  icon: 'ri-building-4-line',  link: '/layout/master/department',       permKey: 'master.department' },
      { title: 'Employment Type',    icon: 'ri-briefcase-4-line', link: '/layout/master/employment-type',  permKey: 'master.emptype' },
      { title: 'Documents',          icon: 'ri-file-text-line',   link: '/layout/master/documents',        permKey: 'master.docs' },
      { title: 'Holiday Types',      icon: 'ri-suitcase-line',    link: '/layout/master/holiday-type',     permKey: 'master.holidaytype' },
      { title: 'Salary Component',   icon: 'ri-wallet-2-line',    link: '/layout/master/salary-component', permKey: 'master.salary' },
      { title: 'Pay Slip Setup',     icon: 'ri-file-pdf-2-line',  link: '/layout/master/pay-slip',         permKey: 'master.payslip' },
      { title: 'Branch',             icon: 'ri-file-pdf-2-line',  link: '/layout/master/branch',           permKey: 'master.branch' },
    ]
  },
  {
    title: 'Setting',
    icon: 'ri-settings-3-line',
    permKey: 'setting',
    children: [
      { title: 'Attendance Master', icon: 'ri-calendar-line',          link: '/layout/attendance/salary-master',  permKey: 'set.attmaster' },
      { title: 'Currency',          icon: 'ri-copper-coin-line',       link: '/layout/master/currency',           permKey: 'set.currency' },
      { title: 'Company Prefix',    icon: 'ri-info-card-line',         link: '/layout/master/prefix',             permKey: 'set.prefix' },
      { title: 'Brand & Colors',    icon: 'ri-palette-line',           link: '/layout/master/brand-colors',       permKey: 'set.brand' },
      { title: 'Company Letterhead', icon: 'ri-file-paper-line',       link: '/layout/master/letterhead',         permKey: 'set.brand' },
      { title: 'Employee Handbook', icon: 'ri-book-2-line',            link: '/layout/master/handbook',           permKey: 'set.handbook' },
      { title: 'Role Permissions',  icon: 'ri-shield-keyhole-line', link: '/layout/master/role-permission', permKey: 'set.roleperm' },
      { title: 'User Permissions',  icon: 'ri-user-settings-line',  link: '/layout/master/user-permission', permKey: 'set.userperm' },
      { title: 'My Sidebar Access', icon: 'ri-eye-line',            link: '/layout/master/user-access',     permKey: 'set.sidebaraccess' },
    ]
  },
];
