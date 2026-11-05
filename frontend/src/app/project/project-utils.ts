import { ExportColumn } from '../shared/utils/table-export';

/** Display helpers shared by HR and portal project / timesheet screens. */

export const PROJECT_STATUSES = [
  { value: 'planned', label: 'Planned' },
  { value: 'active', label: 'Active' },
  { value: 'on_hold', label: 'On hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export const BILLING_TYPES = [
  { value: 'time_material', label: 'Time & material' },
  { value: 'fixed', label: 'Fixed fee' },
  { value: 'non_billable', label: 'Internal (non-billable)' },
];

export const TASK_STATUSES = [
  { value: 'todo', label: 'To do' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'done', label: 'Done' },
];

export const TIMESHEET_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

export const WEEKDAYS = [
  { value: 1, label: 'Mon' }, { value: 2, label: 'Tue' }, { value: 3, label: 'Wed' }, { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' }, { value: 6, label: 'Sat' }, { value: 7, label: 'Sun' },
];

const labelOf = (list: { value: any; label: string }[], v: any) => list.find((x) => x.value === v)?.label || v || '—';
export const projectStatusLabel = (s: string) => labelOf(PROJECT_STATUSES, s);
export const billingLabel = (s: string) => labelOf(BILLING_TYPES, s);
export const taskStatusLabel = (s: string) => labelOf(TASK_STATUSES, s);
export const timesheetStatusLabel = (s: string) => labelOf(TIMESHEET_STATUSES, s);

export function projectStatusBadge(s: string): string {
  return { planned: 'bg-label-secondary', active: 'bg-label-success', on_hold: 'bg-label-warning', completed: 'bg-label-info', cancelled: 'bg-label-danger' }[s] || 'bg-label-secondary';
}

export function timesheetBadge(s: string): string {
  return { draft: 'bg-label-secondary', submitted: 'bg-label-warning', approved: 'bg-label-success', rejected: 'bg-label-danger' }[s] || 'bg-label-secondary';
}

/** Bootstrap colour for a budget state from the API ("ok" | "warning" | "over"). */
export function budgetTone(state: string | undefined): string {
  return state === 'over' ? 'danger' : state === 'warning' ? 'warning' : 'success';
}

export function fmtHours(v: any): string {
  if (v === null || v === undefined || v === '') return '—';
  return `${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 2 })}h`;
}

export function fmtMoney(v: any): string {
  if (v === null || v === undefined || v === '') return '—';
  return '₹' + Number(v).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

export function fmtPct(v: any): string {
  return v === null || v === undefined ? '—' : `${Number(v).toFixed(1)}%`;
}

/** YYYY-MM-DD of the Monday of the week containing `d` (local time). */
export function mondayOf(d: Date = new Date()): string {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const offset = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - offset);
  return isoDate(x);
}

export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return isoDate(new Date(y, m - 1, d + days));
}

export const UTILIZATION_COLUMNS: ExportColumn[] = [
  { header: 'Employee', value: (r) => r.employeeName },
  { header: 'Emp Code', value: (r) => r.empCode },
  { header: 'Department', value: (r) => r.department },
  { header: 'Capacity (h)', value: (r) => r.capacityHours },
  { header: 'Logged (h)', value: (r) => r.loggedHours },
  { header: 'Billable (h)', value: (r) => r.billableHours },
  { header: 'Non-billable (h)', value: (r) => r.nonBillableHours },
  { header: 'Utilization %', value: (r) => r.utilization ?? '' },
  { header: 'Billable utilization %', value: (r) => r.billableUtilization ?? '' },
  { header: 'Projects', value: (r) => r.projects },
];

export const PROJECT_REPORT_COLUMNS: ExportColumn[] = [
  { header: 'Project', value: (r) => r.name },
  { header: 'Code', value: (r) => r.code || '' },
  { header: 'Client', value: (r) => r.clientName },
  { header: 'Manager', value: (r) => r.managerName },
  { header: 'Billing', value: (r) => billingLabel(r.billingType) },
  { header: 'Status', value: (r) => projectStatusLabel(r.status) },
  { header: 'Estimated (h)', value: (r) => r.estimatedHours },
  { header: 'Actual (h)', value: (r) => r.actualHours },
  { header: 'Billable (h)', value: (r) => r.billableHours },
  { header: 'Budget (h)', value: (r) => r.budgetHours ?? '' },
  { header: 'Hours budget used %', value: (r) => r.hoursBudget?.pct ?? '' },
  { header: 'Billable value', value: (r) => r.billableValue },
  { header: 'Cost', value: (r) => r.cost },
  { header: 'Budget amount', value: (r) => r.budgetAmount ?? '' },
  { header: 'Amount budget used %', value: (r) => r.amountBudget?.pct ?? '' },
];

export const CLIENT_REPORT_COLUMNS: ExportColumn[] = [
  { header: 'Client', value: (r) => r.clientName },
  { header: 'Projects', value: (r) => r.projects },
  { header: 'Active', value: (r) => r.activeProjects },
  { header: 'Hours', value: (r) => r.hours },
  { header: 'Billable (h)', value: (r) => r.billableHours },
  { header: 'Billable value', value: (r) => r.billableValue },
  { header: 'Cost', value: (r) => r.cost },
  { header: 'Margin', value: (r) => r.margin },
];

export const RECONCILIATION_COLUMNS: ExportColumn[] = [
  { header: 'Employee', value: (r) => r.employeeName },
  { header: 'Date', value: (r) => r.date },
  { header: 'Attendance (h)', value: (r) => r.attendanceHours ?? '' },
  { header: 'Leave', value: (r) => r.leave || '' },
  { header: 'Holiday', value: (r) => r.holiday || '' },
  { header: 'Logged (h)', value: (r) => r.logged },
  { header: 'Flags', value: (r) => (r.flags || []).map((f: any) => f.message).join('; ') },
];
