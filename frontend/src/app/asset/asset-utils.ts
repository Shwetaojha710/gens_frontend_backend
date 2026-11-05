import { ExportColumn } from '../shared/utils/table-export';

/** Display helpers shared by HR and portal asset screens. */

export const ASSET_STATUSES = [
  { value: 'available', label: 'Available' },
  { value: 'allocated', label: 'Allocated' },
  { value: 'in_repair', label: 'In repair' },
  { value: 'retired', label: 'Retired' },
  { value: 'lost', label: 'Lost' },
];

export const CONDITIONS = [
  { value: 'new', label: 'New' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
  { value: 'damaged', label: 'Damaged' },
];

export const MAINTENANCE_TYPES = [
  { value: 'repair', label: 'Repair' },
  { value: 'service', label: 'Service' },
  { value: 'upgrade', label: 'Upgrade' },
  { value: 'inspection', label: 'Inspection' },
];

const labelOf = (list: { value: string; label: string }[], v: string | null | undefined) =>
  list.find((x) => x.value === v)?.label || v || '—';
export const statusLabel = (s: string) => labelOf(ASSET_STATUSES, s);
export const conditionLabel = (c: string | null) => labelOf(CONDITIONS, c);

export function statusBadge(s: string): string {
  return (
    { available: 'bg-label-success', allocated: 'bg-label-primary', in_repair: 'bg-label-warning', retired: 'bg-label-secondary', lost: 'bg-label-danger' }[s] ||
    'bg-label-secondary'
  );
}

export function conditionBadge(c: string | null): string {
  return (
    { new: 'bg-label-success', good: 'bg-label-success', fair: 'bg-label-info', poor: 'bg-label-warning', damaged: 'bg-label-danger' }[c || ''] ||
    'bg-label-secondary'
  );
}

export function ackLabel(a: string | null): string {
  return { pending: 'Awaiting acknowledgement', acknowledged: 'Acknowledged', disputed: 'Disputed', not_required: 'No acknowledgement needed' }[a || ''] || '—';
}

export function ackBadge(a: string | null): string {
  return { pending: 'bg-label-warning', acknowledged: 'bg-label-success', disputed: 'bg-label-danger' }[a || ''] || 'bg-label-secondary';
}

const EVENT_LABELS: Record<string, string> = {
  registered: 'Registered',
  updated: 'Details updated',
  allocated: 'Allocated',
  acknowledged: 'Receipt acknowledged',
  disputed: 'Receipt disputed',
  return_requested: 'Return requested',
  returned: 'Returned',
  lost: 'Recorded lost',
  condition: 'Condition changed',
  maintenance_opened: 'Maintenance opened',
  maintenance_closed: 'Maintenance closed',
  status: 'Status changed',
};
export const eventLabel = (t: string) => EVENT_LABELS[t] || t;

export function fmtMoney(v: any): string {
  if (v === null || v === undefined || v === '') return '—';
  return '₹' + Number(v).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

export const ASSET_EXPORT_COLUMNS: ExportColumn[] = [
  { header: 'Asset ID', value: (a) => a.assetTag },
  { header: 'Name', value: (a) => a.name },
  { header: 'Category', value: (a) => a.category },
  { header: 'Brand / model', value: (a) => [a.brand, a.model].filter(Boolean).join(' ') },
  { header: 'Serial no.', value: (a) => a.serialNumber || '' },
  { header: 'Status', value: (a) => statusLabel(a.status) },
  { header: 'Condition', value: (a) => conditionLabel(a.condition) },
  { header: 'Holder', value: (a) => a.holder?.name || '' },
  { header: 'Allocated on', value: (a) => a.holder?.allocatedOn || '' },
  { header: 'Purchase date', value: (a) => a.purchaseDate || '' },
  { header: 'Cost', value: (a) => (a.purchaseCost ?? '') },
  { header: 'Warranty until', value: (a) => a.warrantyExpiry || '' },
  { header: 'Location', value: (a) => a.location || '' },
];

export const CLEARANCE_EXPORT_COLUMNS: ExportColumn[] = [
  { header: 'Employee', value: (r) => r.employeeName },
  { header: 'Emp code', value: (r) => r.empCode },
  { header: 'Department', value: (r) => r.department },
  { header: 'Last working day', value: (r) => r.lastWorkingDay || '' },
  { header: 'Days since exit', value: (r) => r.daysSinceExit ?? '' },
  { header: 'Assets pending', value: (r) => r.pendingCount },
  { header: 'Pending assets', value: (r) => r.pendingAssets.map((a: any) => `${a.assetTag} ${a.name}`).join('; ') },
  { header: 'Pending value', value: (r) => r.pendingValue },
  { header: 'Recovery amount', value: (r) => r.recoveryTotal },
  { header: 'Cleared', value: (r) => (r.cleared ? 'Yes' : 'No') },
];

/** Opens a print window with QR labels (SVG strings come from our own backend). */
export function printLabels(labels: { assetTag: string; name: string; serialNumber?: string; svg: string }[], company: string): boolean {
  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) return false;
  const esc = (s: string) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
  const cells = labels
    .map(
      (l) => `<div class="label"><div class="qr">${l.svg}</div><div class="txt"><div class="co">${esc(company)}</div>
        <div class="tag">${esc(l.assetTag)}</div><div class="nm">${esc(l.name)}</div>${l.serialNumber ? `<div class="sn">S/N ${esc(l.serialNumber)}</div>` : ''}</div></div>`,
    )
    .join('');
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Asset labels</title><style>
    body{font-family:Arial,sans-serif;margin:8mm}
    .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:4mm}
    .label{display:flex;gap:3mm;align-items:center;border:1px dashed #999;padding:3mm;break-inside:avoid}
    .qr svg{width:26mm;height:26mm}.co{font-size:8pt;color:#555}.tag{font-size:13pt;font-weight:700}
    .nm{font-size:9pt}.sn{font-size:7pt;color:#555}
  </style></head><body><div class="grid">${cells}</div><script>window.onload=function(){window.print()}<\/script></body></html>`);
  win.document.close();
  return true;
}
