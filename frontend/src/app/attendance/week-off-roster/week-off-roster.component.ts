import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { Notyf } from 'notyf';
import * as XLSX from 'xlsx';
import { AttendanceService } from '../../services/attendance.service';

type CellType = '' | 'WO' | 'WORKING';

interface RosterEmployee {
  id: string;
  name: string;
  empCode: string;
  shift_id: string;
  week_off_days: string[];
  shift_week_off_days: string[];
  roster: { id: string; date: string; type: CellType; remark?: string }[];
  week_off_dates: string[];
}

/**
 * Employee-wise week off roster.
 * Each cell: Default (fixed days / shift) -> WO -> Working -> Default.
 * Only changed cells are sent to the server.
 */
@Component({
  selector: 'app-week-off-roster',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectModule],
  templateUrl: './week-off-roster.component.html',
  styleUrl: './week-off-roster.component.css',
})
export class WeekOffRosterComponent implements OnInit {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  notyf = new Notyf();

  months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ].map((label, i) => ({ value: i + 1, label }));
  years: { value: number; label: string }[] = [];
  month = new Date().getMonth() + 1;
  year = new Date().getFullYear();
  search = '';

  loading = false;
  saving = false;
  dates: { date: string; day: number; dayName: string; short: string }[] = [];
  employees: RosterEmployee[] = [];
  /** saved roster per employee/date */
  private original = new Map<string, CellType>();
  /** current (edited) roster per employee/date */
  cells = new Map<string, CellType>();

  constructor(private attendanceService: AttendanceService) {
    const y = new Date().getFullYear();
    for (let i = y - 2; i <= y + 1; i++) this.years.push({ value: i, label: String(i) });
  }

  ngOnInit(): void {
    this.load();
  }

  private key(empId: string, date: string) {
    return `${empId}|${date}`;
  }

  private pad(n: number) {
    return String(n).padStart(2, '0');
  }

  private buildDates() {
    const days = new Date(this.year, this.month, 0).getDate();
    const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    this.dates = [];
    for (let d = 1; d <= days; d++) {
      const dt = new Date(this.year, this.month - 1, d);
      const dayName = names[dt.getDay()];
      this.dates.push({
        date: `${this.year}-${this.pad(this.month)}-${this.pad(d)}`,
        day: d,
        dayName,
        short: dayName.slice(0, 2),
      });
    }
  }

  get filteredEmployees(): RosterEmployee[] {
    const q = this.search.trim().toLowerCase();
    if (!q) return this.employees;
    return this.employees.filter(
      (e) => (e.name || '').toLowerCase().includes(q) || String(e.empCode || '').toLowerCase().includes(q),
    );
  }

  get pendingCount(): number {
    return this.getChanges().length;
  }

  load() {
    if (this.pendingCount && !confirm('Unsaved changes will be lost. Continue?')) return;
    this.buildDates();
    this.loading = true;
    const fromDate = this.dates[0].date;
    const toDate = this.dates[this.dates.length - 1].date;
    this.attendanceService.getWeekOffRoster({ fromDate, toDate }).subscribe({
      next: (res: any) => {
        this.loading = false;
        if (!res?.status) {
          this.employees = [];
          this.notyf.error(res?.message || 'No data found');
          return;
        }
        this.employees = res.data || [];
        this.original.clear();
        this.cells.clear();
        this.employees.forEach((e) =>
          (e.roster || []).forEach((r) => {
            this.original.set(this.key(e.id, r.date), r.type);
            this.cells.set(this.key(e.id, r.date), r.type);
          }),
        );
      },
      error: (err) => {
        this.loading = false;
        this.notyf.error(err?.error?.message || 'Failed to load roster');
      },
    });
  }

  cellType(emp: RosterEmployee, date: string): CellType {
    return this.cells.get(this.key(emp.id, date)) || '';
  }

  /** Week off as per fixed days / shift (without roster). */
  isDefaultOff(emp: RosterEmployee, dayName: string): boolean {
    const fixed = emp.week_off_days || [];
    return fixed.length ? fixed.includes(dayName) : (emp.shift_week_off_days || []).includes(dayName);
  }

  isOff(emp: RosterEmployee, d: { date: string; dayName: string }): boolean {
    const t = this.cellType(emp, d.date);
    if (t === 'WO') return true;
    if (t === 'WORKING') return false;
    return this.isDefaultOff(emp, d.dayName);
  }

  isChanged(emp: RosterEmployee, date: string): boolean {
    const k = this.key(emp.id, date);
    return (this.original.get(k) || '') !== (this.cells.get(k) || '');
  }

  toggle(emp: RosterEmployee, d: { date: string; dayName: string }) {
    const k = this.key(emp.id, d.date);
    const cur = this.cells.get(k) || '';
    // Default -> opposite of default -> other override -> Default
    const defaultOff = this.isDefaultOff(emp, d.dayName);
    const order: CellType[] = defaultOff ? ['', 'WORKING', 'WO'] : ['', 'WO', 'WORKING'];
    const next = order[(order.indexOf(cur) + 1) % order.length];
    if (next) this.cells.set(k, next);
    else this.cells.delete(k);
  }

  cellLabel(emp: RosterEmployee, d: { date: string; dayName: string }): string {
    const t = this.cellType(emp, d.date);
    if (t === 'WO') return 'WO';
    if (t === 'WORKING') return 'W';
    return this.isDefaultOff(emp, d.dayName) ? 'wo' : '';
  }

  cellTitle(emp: RosterEmployee, d: { date: string; dayName: string }): string {
    const t = this.cellType(emp, d.date);
    const src = t === 'WO' ? 'Roster: Week Off' : t === 'WORKING' ? 'Roster: Working'
      : this.isDefaultOff(emp, d.dayName)
        ? (emp.week_off_days?.length ? 'Fixed week off' : 'Shift week off')
        : 'Working (default)';
    return `${d.date} (${d.dayName}) - ${src}. Click to change.`;
  }

  defaultText(emp: RosterEmployee): string {
    if (emp.week_off_days?.length) return emp.week_off_days.map((d) => d.slice(0, 3)).join(', ');
    const s = emp.shift_week_off_days || [];
    return s.length ? `${s.map((d) => d.slice(0, 3)).join(', ')} (shift)` : '-';
  }

  private getChanges() {
    const changes: { employeeId: string; date: string; type: CellType | null }[] = [];
    const keys = new Set([...this.original.keys(), ...this.cells.keys()]);
    keys.forEach((k) => {
      const before = this.original.get(k) || '';
      const after = this.cells.get(k) || '';
      if (before === after) return;
      const [employeeId, date] = k.split('|');
      changes.push({ employeeId, date, type: after || null });
    });
    return changes;
  }

  resetChanges() {
    this.cells = new Map(this.original);
  }

  save() {
    const entries = this.getChanges();
    if (!entries.length) {
      this.notyf.error('No changes to save');
      return;
    }
    this.saving = true;
    this.attendanceService.saveWeekOffRoster({ entries }).subscribe({
      next: (res: any) => {
        this.saving = false;
        if (!res?.status) {
          this.notyf.error(res?.message || 'Save failed');
          return;
        }
        const errs = res?.data?.errors?.length || 0;
        this.notyf.success(`Saved ${res?.data?.saved || 0}, removed ${res?.data?.removed || 0}` + (errs ? `, ${errs} failed` : ''));
        this.original = new Map(this.cells);
        this.load();
      },
      error: (err) => {
        this.saving = false;
        this.notyf.error(err?.error?.message || 'Save failed');
      },
    });
  }

  downloadTemplate() {
    const rows: any[][] = [['EmpCode', 'Date (YYYY-MM-DD)', 'Type (WO / WORKING / blank = remove)', 'Remark']];
    const sample = this.filteredEmployees[0];
    if (sample) rows.push([sample.empCode, this.dates[0]?.date, 'WO', 'Example']);
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'WeekOffRoster');
    XLSX.writeFile(wb, 'week_off_roster_template.xlsx');
  }

  onFile(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!/\.(xlsx|xls)$/i.test(file.name)) {
      this.notyf.error('Only Excel files (.xls, .xlsx) are allowed!');
      input.value = '';
      return;
    }
    const fd = new FormData();
    fd.append('file', file);
    this.saving = true;
    this.attendanceService.uploadWeekOffRoster(fd).subscribe({
      next: (res: any) => {
        this.saving = false;
        input.value = '';
        if (!res?.status) {
          this.notyf.error(res?.message || 'Upload failed');
          return;
        }
        const errs = res?.data?.errors || [];
        this.notyf.success(`Uploaded: ${res?.data?.saved || 0} saved, ${res?.data?.removed || 0} removed`);
        if (errs.length) {
          this.notyf.error(`${errs.length} row(s) skipped: ` +
            errs.slice(0, 3).map((e: any) => `${e.row ? 'row ' + e.row + ' ' : ''}${e.error}`).join('; '));
        }
        this.original.clear();
        this.cells.clear();
        this.load();
      },
      error: (err) => {
        this.saving = false;
        input.value = '';
        this.notyf.error(err?.error?.message || 'Upload failed');
      },
    });
  }
}
