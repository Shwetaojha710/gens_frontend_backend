import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { fmtHours, timesheetBadge, timesheetStatusLabel } from '../project-utils';

interface GridRow {
  key: string;
  projectName: string;
  taskTitle: string;
  billable: boolean;
  hours: Record<string, number>;
  total: number;
}

/**
 * Read-only week of a timesheet for approvers: project × day grid, attendance
 * comparison per day, notes, and the approve / reject panel.
 */
@Component({
  selector: 'app-pt-timesheet-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pt-timesheet-view.component.html',
})
export class PtTimesheetViewComponent implements OnChanges {
  @Input() detail: any = null;
  @Input() canAct = false;
  @Input() busy = false;
  @Output() decide = new EventEmitter<{ action: 'approved' | 'rejected'; comments: string }>();

  rows: GridRow[] = [];
  dayTotals: Record<string, number> = {};
  comments = '';

  readonly fmtHours = fmtHours;
  readonly badge = timesheetBadge;
  readonly statusLabel = timesheetStatusLabel;

  ngOnChanges(): void {
    this.comments = '';
    this.rows = [];
    this.dayTotals = {};
    if (!this.detail) return;
    const byKey: Record<string, GridRow> = {};
    for (const e of this.detail.entries) {
      const key = `${e.projectId}|${e.taskId || ''}|${e.isBillable}`;
      const row = (byKey[key] = byKey[key] || { key, projectName: e.projectName, taskTitle: e.taskTitle, billable: e.isBillable, hours: {}, total: 0 });
      row.hours[e.date] = (row.hours[e.date] || 0) + e.hours;
      row.total += e.hours;
      this.dayTotals[e.date] = (this.dayTotals[e.date] || 0) + e.hours;
    }
    this.rows = Object.values(byKey);
  }

  get notes(): any[] {
    return (this.detail?.entries || []).filter((e: any) => e.notes);
  }

  recFor(date: string): any {
    return this.detail?.reconciliation?.find((r: any) => r.date === date);
  }

  get flagCount(): number {
    return (this.detail?.reconciliation || []).reduce((s: number, r: any) => s + (r.flags?.length || 0), 0);
  }
}
