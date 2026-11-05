import { ExportColumn } from '../shared/utils/table-export';
import { fmtPct, fmtRating, potentialLabel } from './performance-utils';

export const REVIEW_EXPORT_COLUMNS: ExportColumn[] = [
  { header: 'Emp Code', value: (r) => r.empCode },
  { header: 'Employee', value: (r) => r.employeeName },
  { header: 'Department', value: (r) => r.department },
  { header: 'Designation', value: (r) => r.designation },
  { header: 'Manager', value: (r) => r.managerName },
  { header: 'Status', value: (r) => r.statusLabel },
  { header: 'Goal Achievement', value: (r) => fmtPct(r.goalAchievement) },
  { header: 'Self Rating', value: (r) => fmtRating(r.selfRating) },
  { header: 'Manager Rating', value: (r) => fmtRating(r.managerRating) },
  { header: '360 Rating', value: (r) => fmtRating(r.feedbackRating) },
  { header: 'Final Rating', value: (r) => fmtRating(r.finalRating) },
  { header: 'Rating', value: (r) => r.ratingLabel || '—' },
  { header: 'Potential', value: (r) => potentialLabel(r.potentialRating) },
  { header: 'Nine-Box', value: (r) => r.nineBox || '—' },
];

export const DEPARTMENT_EXPORT_COLUMNS: ExportColumn[] = [
  { header: 'Department', value: (d) => d.department },
  { header: 'Employees', value: (d) => d.employees },
  { header: 'Completed', value: (d) => d.completed },
  { header: 'Avg Final Rating', value: (d) => fmtRating(d.avgFinalRating) },
  { header: 'Avg Goal Achievement', value: (d) => fmtPct(d.avgGoalAchievement) },
  { header: 'Avg Manager Rating', value: (d) => fmtRating(d.avgManagerRating) },
  { header: 'Avg 360 Rating', value: (d) => fmtRating(d.avgFeedbackRating) },
  { header: 'High Performers', value: (d) => d.highPerformers },
  { header: 'Low Performers', value: (d) => d.lowPerformers },
];
