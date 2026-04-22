import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Notyf } from 'notyf';
import { EmployeePortalService } from '../services/employee-portal.service';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

@Component({
  selector: 'app-employee-portal-attendance',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './employee-portal-attendance.component.html',
  styleUrl: './employee-portal-attendance.component.css',
})
export class EmployeePortalAttendanceComponent implements OnInit {
  month = new Date().getMonth() + 1;
  year = new Date().getFullYear();
  loading = false;
  rows: Record<string, unknown>[] = [];
  readonly monthNames = MONTH_NAMES;
  private notyf = new Notyf();

  constructor(private api: EmployeePortalService) {}

  ngOnInit(): void {
    this.load();
  }

  get periodLabel(): string {
    const m = this.monthNames[(this.month || 1) - 1] || '';
    return `${m} ${this.year}`;
  }

  /** Normalize API status string into a bucket for stats + badges */
  statusCategory(status: string): string {
    const s = (status || '').toLowerCase();
    if (s.includes('week off')) return 'weekOff';
    if (s.includes('holiday')) return 'holiday';
    if (s.includes('on leave') || s.includes('first half') || s.includes('second half')) return 'leave';
    if (s.includes('absent')) return 'absent';
    if (s.includes('half day')) return 'halfDay';
    if (s.includes('late')) return 'late';
    if (s.includes('on time')) return 'onTime';
    return 'other';
  }

  get attendanceStats(): {
    total: number;
    onTime: number;
    late: number;
    absent: number;
    weekOff: number;
    timeOff: number;
  } {
    const acc = {
      onTime: 0,
      late: 0,
      absent: 0,
      weekOff: 0,
      holiday: 0,
      leave: 0,
      halfDay: 0,
      other: 0,
    };
    for (const r of this.rows) {
      const cat = this.statusCategory(String(r['status'] ?? ''));
      switch (cat) {
        case 'onTime':
          acc.onTime++;
          break;
        case 'late':
          acc.late++;
          break;
        case 'absent':
          acc.absent++;
          break;
        case 'weekOff':
          acc.weekOff++;
          break;
        case 'holiday':
          acc.holiday++;
          break;
        case 'leave':
          acc.leave++;
          break;
        case 'halfDay':
          acc.halfDay++;
          break;
        default:
          acc.other++;
      }
    }
    return {
      total: this.rows.length,
      onTime: acc.onTime,
      late: acc.late,
      absent: acc.absent,
      weekOff: acc.weekOff,
      timeOff: acc.holiday + acc.leave + acc.halfDay + acc.other,
    };
  }

  rowStatus(row: Record<string, unknown>): string {
    return String(row['status'] ?? '');
  }

  statusBadgeClass(status: string): string {
    const cat = this.statusCategory(status);
    const map: Record<string, string> = {
      onTime: 'ep-att-badge ep-att-badge--ontime',
      late: 'ep-att-badge ep-att-badge--late',
      absent: 'ep-att-badge ep-att-badge--absent',
      weekOff: 'ep-att-badge ep-att-badge--weekoff',
      holiday: 'ep-att-badge ep-att-badge--holiday',
      leave: 'ep-att-badge ep-att-badge--leave',
      halfDay: 'ep-att-badge ep-att-badge--half',
      other: 'ep-att-badge ep-att-badge--neutral',
    };
    return map[cat] || map['other'];
  }

  load(): void {
    this.loading = true;
    this.api.getMonthlyAttendance(this.month, this.year).subscribe({
      next: (raw: unknown) => {
        this.loading = false;
        const r = raw as {
          AttendanceList?: { data?: Record<string, unknown>[] }[];
        };
        this.rows = r.AttendanceList?.[0]?.data || [];
      },
      error: (err: Error) => {
        this.loading = false;
        this.notyf.error(err.message || 'Could not load attendance.');
      },
    });
  }
}
