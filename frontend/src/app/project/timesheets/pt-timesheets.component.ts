import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { Notyf } from 'notyf';
import { ProjectService } from '../../services/project.service';
import { MasterService } from '../../services/master.service';
import { PtTimesheetViewComponent } from '../timesheet-view/pt-timesheet-view.component';
import { TIMESHEET_STATUSES, fmtHours, timesheetBadge, timesheetStatusLabel } from '../project-utils';

/** HR: every submitted / decided timesheet; HR can decide any submitted week. */
@Component({
  selector: 'app-pt-timesheets',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectModule, PtTimesheetViewComponent],
  templateUrl: './pt-timesheets.component.html',
})
export class PtTimesheetsComponent implements OnInit {
  private notyf = new Notyf();

  filters: any = { status: 'submitted', weekStart: '', employeeId: null };
  rows: any[] = [];
  employeeOptions: any[] = [];
  loading = false;
  busy = false;
  openId: string | null = null;
  detail: any = null;
  canAct = false;

  readonly statuses = TIMESHEET_STATUSES;
  readonly fmtHours = fmtHours;
  readonly badge = timesheetBadge;
  readonly statusLabel = timesheetStatusLabel;

  constructor(private api: ProjectService, private master: MasterService) {}

  ngOnInit(): void {
    this.master.getemployeeList().subscribe((res: any) => {
      this.employeeOptions = res?.status === true ? res.data.filter((o: any) => o.value && o.value !== 'All') : [];
    });
    this.load();
  }

  load(): void {
    this.loading = true;
    const f = this.filters;
    this.api.listTimesheets({ status: f.status || null, weekStart: f.weekStart || null, employeeId: f.employeeId }).subscribe({
      next: (res: any) => {
        this.loading = false;
        this.rows = res?.status === true ? res.data : [];
      },
      error: () => (this.loading = false),
    });
  }

  open(id: string): void {
    this.openId = id;
    this.detail = null;
    this.api.timesheetDetail('hr', id).subscribe((res: any) => {
      if (res?.status !== true) {
        this.notyf.error(res?.message || 'Unable to load timesheet');
        this.openId = null;
        return;
      }
      this.detail = res.data;
      this.canAct = !!res.data.permissions?.canAct;
    });
  }

  onDecide(d: { action: 'approved' | 'rejected'; comments: string }): void {
    if (!this.openId) return;
    const id = this.openId;
    this.busy = true;
    this.api.actOnTimesheet('hr', id, d.action, d.comments).subscribe({
      next: (res: any) => {
        this.busy = false;
        if (res?.status === true) {
          this.notyf.success(res.message);
          this.open(id);
          this.load();
        } else this.notyf.error(res?.message || 'Request failed');
      },
      error: () => (this.busy = false),
    });
  }
}
