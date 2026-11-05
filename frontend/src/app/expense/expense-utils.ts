import { environment } from '../../environments/environment';
import { ExportColumn } from '../shared/utils/table-export';

/** Display helpers shared by HR and portal expense screens. */

export const CLAIM_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved (unpaid)' },
  { value: 'paid', label: 'Paid' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Withdrawn' },
];

export const APPROVAL_LEVELS = [
  { value: 'manager', label: 'Reporting manager' },
  { value: 'skip_manager', label: 'Skip-level manager' },
  { value: 'hr', label: 'HR' },
  { value: 'finance', label: 'Finance' },
];

export const PAYMENT_MODES = [
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'upi', label: 'UPI' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'cash', label: 'Cash' },
  { value: 'payroll', label: 'With salary (payroll)' },
];

export function claimStatusLabel(s: string): string {
  return CLAIM_STATUSES.find((x) => x.value === s)?.label || s;
}

export function claimStatusBadge(s: string): string {
  switch (s) {
    case 'pending': return 'bg-label-warning';
    case 'approved': return 'bg-label-info';
    case 'paid': return 'bg-label-success';
    case 'rejected': return 'bg-label-danger';
    default: return 'bg-label-secondary';
  }
}

export function levelLabel(l: string | null): string {
  return APPROVAL_LEVELS.find((x) => x.value === l)?.label || l || '—';
}

export function paymentModeLabel(m: string | null): string {
  return PAYMENT_MODES.find((x) => x.value === m)?.label || m || '—';
}

export function fmtMoney(v: any): string {
  if (v === null || v === undefined || v === '') return '—';
  return '₹' + Number(v).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

/** Public URL of an uploaded receipt (served from the backend's upload folder). */
export function receiptUrl(fileName: string): string {
  if (!fileName) return '';
  const serverRoot = environment.apiUrl.replace(/\/api\/?$/, '');
  return `${serverRoot}/${fileName.replace(/^\//, '')}`;
}

export const CLAIM_EXPORT_COLUMNS: ExportColumn[] = [
  { header: 'Claim No', value: (r) => r.claimNo || '(legacy)' },
  { header: 'Employee', value: (r) => r.employeeName },
  { header: 'Emp Code', value: (r) => r.empCode },
  { header: 'Department', value: (r) => r.department },
  { header: 'Title', value: (r) => r.title },
  { header: 'Categories', value: (r) => (r.categories || []).join(', ') },
  { header: 'Expense From', value: (r) => r.fromDate },
  { header: 'Expense To', value: (r) => r.toDate },
  { header: 'Amount', value: (r) => Number(r.amount) },
  { header: 'Status', value: (r) => claimStatusLabel(r.status) },
  { header: 'Pending With', value: (r) => (r.pendingWith ? levelLabel(r.pendingWith) : '') },
  { header: 'Flags', value: (r) => r.flagCount || 0 },
  { header: 'Payment Mode', value: (r) => (r.paymentMode ? paymentModeLabel(r.paymentMode) : '') },
  { header: 'Payment Ref', value: (r) => r.paymentReference || '' },
  { header: 'Paid On', value: (r) => r.paidAt || '' },
];

export const ITEM_EXPORT_COLUMNS: ExportColumn[] = [
  { header: 'Claim No', value: (r) => r.claimNo || '(legacy)' },
  { header: 'Employee', value: (r) => r.employeeName },
  { header: 'Category', value: (r) => r.category },
  { header: 'Date', value: (r) => r.expenseDate },
  { header: 'Merchant', value: (r) => r.merchant || '' },
  { header: 'Invoice No', value: (r) => r.invoiceNo || '' },
  { header: 'Amount', value: (r) => Number(r.amount) },
  { header: 'Status', value: (r) => claimStatusLabel(r.status) },
  { header: 'Flags', value: (r) => r.flags || '' },
];
