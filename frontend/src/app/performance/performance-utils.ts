/** Display helpers shared by HR and portal performance screens. */

export const REVIEW_STATUSES = [
  { value: 'goal_setting', label: 'Goal Setting' },
  { value: 'self_review', label: 'Self Review' },
  { value: 'manager_review', label: 'Manager Review' },
  { value: 'in_approval', label: 'In Approval' },
  { value: 'approved', label: 'Approved' },
];

export const CYCLE_TYPES = [
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'half_yearly', label: 'Half-Yearly' },
  { value: 'annual', label: 'Annual' },
  { value: 'custom', label: 'Custom' },
];

export const APPROVAL_LEVEL_OPTIONS = [
  { value: 'skip_manager', label: "Skip-level manager (manager's manager)" },
  { value: 'hr', label: 'HR' },
];

export const POTENTIAL_OPTIONS = [
  { value: 1, label: 'Low' },
  { value: 2, label: 'Moderate' },
  { value: 3, label: 'High' },
];

export const RELATIONSHIP_OPTIONS = [
  { value: 'peer', label: 'Peer' },
  { value: 'direct_report', label: 'Direct report' },
  { value: 'manager', label: 'Manager / senior' },
];

export function statusBadge(status: string): string {
  switch (status) {
    case 'goal_setting': return 'bg-label-secondary';
    case 'self_review': return 'bg-label-info';
    case 'manager_review': return 'bg-label-warning';
    case 'in_approval': return 'bg-label-primary';
    case 'approved': return 'bg-label-success';
    default: return 'bg-label-secondary';
  }
}

export function cycleTypeLabel(type: string): string {
  return CYCLE_TYPES.find((t) => t.value === type)?.label || type;
}

export function approvalLevelLabel(level: string): string {
  return level === 'skip_manager' ? 'Skip-level manager' : level === 'hr' ? 'HR' : level;
}

export function relationshipLabel(rel: string): string {
  return RELATIONSHIP_OPTIONS.find((r) => r.value === rel)?.label || rel;
}

export function potentialLabel(p: number | null | undefined): string {
  return POTENTIAL_OPTIONS.find((o) => o.value === Number(p))?.label || '—';
}

export function fmtRating(v: any): string {
  return v === null || v === undefined || v === '' ? '—' : Number(v).toFixed(2);
}

export function fmtPct(v: any): string {
  return v === null || v === undefined || v === '' ? '—' : `${Number(v).toFixed(1)}%`;
}

/** Bootstrap colour for a 0-5 rating. */
export function ratingTone(v: any): string {
  if (v === null || v === undefined) return 'secondary';
  const n = Number(v);
  if (n >= 4) return 'success';
  if (n >= 3) return 'primary';
  if (n >= 2) return 'warning';
  return 'danger';
}

/** Background tone for a nine-box cell, by performance band + potential. */
export function nineBoxTone(band: number, potential: number): string {
  const score = band + potential;
  if (score >= 5) return 'success';
  if (score === 4) return 'primary';
  if (score === 3) return 'warning';
  return 'danger';
}
