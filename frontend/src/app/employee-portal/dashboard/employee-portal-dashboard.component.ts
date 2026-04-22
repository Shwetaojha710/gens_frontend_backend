import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NgApexchartsModule } from 'ng-apexcharts';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexDataLabels,
  ApexGrid,
  ApexLegend,
  ApexNonAxisChartSeries,
  ApexPlotOptions,
  ApexResponsive,
  ApexXAxis,
  ApexYAxis,
} from 'ng-apexcharts';
import { Notyf } from 'notyf';
import { EmployeePortalService } from '../services/employee-portal.service';

type EpDonutOptions = Partial<{
  series: ApexNonAxisChartSeries;
  chart: ApexChart;
  labels: string[];
  colors: string[];
  dataLabels: ApexDataLabels;
  legend: ApexLegend;
  plotOptions: ApexPlotOptions;
  responsive: ApexResponsive[];
}>;

type EpBarOptions = Partial<{
  series: ApexAxisChartSeries;
  chart: ApexChart;
  dataLabels: ApexDataLabels;
  plotOptions: ApexPlotOptions;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  colors: string[];
  grid: ApexGrid;
}>;

const STATUS_BUCKET_COLORS: Record<string, string> = {
  'On time': '#16a34a',
  Late: '#ca8a04',
  'Half day': '#ea580c',
  'On leave': '#7c3aed',
  Absent: '#dc2626',
  Holiday: '#2563eb',
  'Week off': '#94a3b8',
  Other: '#64748b',
};

/** Calendar day index (1–366); stable per day for quote rotation. */
function epDashDayOfYear(): number {
  const d = new Date();
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d.getTime() - start.getTime()) / 86400000);
}

const EP_DASH_QUOTES: ReadonlyArray<{ text: string; author: string }> = [
  { text: 'The way to get started is to quit talking and begin doing.', author: 'Walt Disney' },
  { text: 'Innovation distinguishes between a leader and a follower.', author: 'Steve Jobs' },
  { text: 'Your work is going to fill a large part of your life.', author: 'Steve Jobs' },
  { text: 'Success is not final; failure is not fatal: it is the courage to continue that counts.', author: 'Winston Churchill' },
  { text: 'Quality means doing it right when no one is looking.', author: 'Henry Ford' },
  { text: 'Alone we can do so little; together we can do so much.', author: 'Helen Keller' },
  { text: 'It always seems impossible until it is done.', author: 'Nelson Mandela' },
  { text: 'Do what you do so well that people will pay to see you do it again.', author: 'Phyllis Diller' },
  { text: 'The future depends on what you do today.', author: 'Mahatma Gandhi' },
  { text: 'Well done is better than well said.', author: 'Benjamin Franklin' },
  { text: 'Efficiency is doing things right; effectiveness is doing the right things.', author: 'Peter Drucker' },
  { text: 'A goal without a plan is just a wish.', author: 'Antoine de Saint-Exupéry' },
  { text: 'Do not watch the clock; do what it does. Keep going.', author: 'Sam Levenson' },
  { text: 'The secret of getting ahead is getting started.', author: 'Mark Twain' },
  { text: 'Opportunities don’t happen. You create them.', author: 'Chris Grosser' },
  { text: 'Discipline is the bridge between goals and accomplishment.', author: 'Jim Rohn' },
  { text: 'Strive not to be a success, but rather to be of value.', author: 'Albert Einstein' },
  { text: 'I find that the harder I work, the more luck I seem to have.', author: 'Thomas Jefferson' },
  { text: 'Start where you are. Use what you have. Do what you can.', author: 'Arthur Ashe' },
  { text: 'Small progress is still progress.', author: 'Anonymous' },
  { text: 'Focus on being productive instead of busy.', author: 'Tim Ferriss' },
  { text: 'The expert in anything was once a beginner.', author: 'Helen Hayes' },
  { text: 'Good teams build good products.', author: 'Anonymous' },
  { text: 'Clarity comes from engagement, not thought.', author: 'Marie Forleo' },
];

const EP_DASH_MOTIVATIONS: readonly string[] = [
  'You bring something unique to the team—thank you for showing up with intention today.',
  'One focused hour beats a full day of distraction. You’ve got this.',
  'Celebrate small wins—they add up to big outcomes.',
  'Your effort today plants seeds for tomorrow’s results.',
  'Be kind to yourself while you pursue excellence.',
  'Progress over perfection. Keep moving forward.',
  'Your collaboration makes the workplace better for everyone.',
  'Take a breath, prioritize, then tackle the next step.',
  'Consistency beats intensity. Steady work wins.',
  'You’re allowed to learn on the job—that’s how growth happens.',
  'Clear communication saves time—your clarity matters.',
  'Energy follows attention. Aim it at what matters most.',
  'Trust the process; you’re building skills every day.',
  'A short walk or stretch can reset your focus—try it.',
  'Finish one meaningful task before opening the next distraction.',
  'Your calm presence helps others stay steady too.',
  'Ask for help early—it’s a strength, not a weakness.',
  'Document wins today—you’ll thank yourself later.',
  'Balance ambition with rest; both fuel performance.',
  'You don’t need to do everything—just the next right thing.',
  'Gratitude shifts perspective. Name one thing going well.',
  'Ship something small today. Momentum builds confidence.',
  'Listen actively in your next meeting—it builds trust fast.',
  'Protect deep-work blocks; they’re where real progress lives.',
];

const EP_DASH_TIPS: readonly string[] = [
  'Try the two-minute rule: if it takes less than two minutes, do it now.',
  'Block 25 minutes for one task, then a 5-minute break (Pomodoro).',
  'Mute notifications during your top priority block.',
  'End the day by writing tomorrow’s first task.',
  'Stand and stretch every hour—your back will thank you.',
  'Reply to email in batches instead of all day.',
  'Keep water at your desk—hydration helps focus.',
  'Clarify the goal before you start the work.',
  'Say no to one low-value meeting this week.',
  'Use a single to-do list—scattered lists create stress.',
  'Start hard tasks when your energy is highest.',
  'Turn big tasks into three concrete next steps.',
  'Review yesterday’s notes before new work.',
  'Close unused browser tabs—mental clutter is real.',
  'Praise a colleague in public; it lifts the whole team.',
  'Leave slack messages with clear next actions.',
  'Schedule thinking time, not only meeting time.',
  'File documents with a consistent naming pattern.',
  'Back up important files before Friday.',
  'Dim your screen slightly in the evening to reduce strain.',
  'Voice-message yourself a reminder—quick capture wins.',
  'Read for 10 minutes on a skill you want to grow.',
  'Declutter your desk for five minutes—clear space, clear mind.',
  'Share knowledge in a short doc—teaching reinforces learning.',
  'Plan breaks—they’re part of productivity, not a distraction.',
];

@Component({
  selector: 'app-employee-portal-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, NgApexchartsModule],
  templateUrl: './employee-portal-dashboard.component.html',
  styleUrls: ['./employee-portal-dashboard.component.css'],
})
export class EmployeePortalDashboardComponent implements OnInit {
  loading = true;
  chartsLoading = true;
  profileLoading = true;
  marking = false;
  daily: Record<string, unknown> | null = null;
  /** All leave rows for current month (stats + table). */
  leavesAll: unknown[] = [];
  profile: Record<string, unknown> | null = null;
  payslipChecked = false;
  payslipHasData = false;
  /** Full year list from API (dashboard card filters locally). */
  holidaysRaw: Record<string, unknown>[] = [];
  /** `null` = all holiday types */
  holidayTypeFilter: string | null = null;
  attendanceSummary: Record<string, unknown> | null = null;
  /** Payroll-aligned late / allowance preview from `get-monthly-attendance` (master attendance settings). */
  latePayrollPreview: Record<string, unknown> | null = null;
  donutOptions: EpDonutOptions = {};
  hoursChartOptions: EpBarOptions = {};
  private notyf = new Notyf();
  /** Logged-in employee (portal); used to filter leave list to self only. */
  private myEmployeeId = '';
  /** Upcoming leave (API: fromDate after reference date); split for dashboard. */
  upcomingLeavesLoading = false;
  upcomingMyLeaves: Record<string, unknown>[] = [];
  upcomingTeamLeaves: Record<string, unknown>[] = [];
  /** Per leave type from get-emp-leave-list */
  leaveBalancesLoading = false;
  leaveBalances: Record<string, unknown>[] = [];

  constructor(private api: EmployeePortalService) {}

  ngOnInit(): void {
    try {
      const u = JSON.parse(localStorage.getItem('empPortalUser') || '{}') as { id?: string };
      this.myEmployeeId = u.id != null ? String(u.id) : '';
    } catch {
      this.myEmployeeId = '';
    }
    this.refresh();
    console.log(this.chartsLoading,this.latePolicyVisible,">>>>>");

  }

  get greeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }

  get displayName(): string {
    const p = this.profile;
    if (p) {
      const n = [p['firstName'], p['lastName']].filter(Boolean).join(' ').trim();
      if (n) return n;
    }
    try {
      const u = JSON.parse(localStorage.getItem('empPortalUser') || '{}') as {
        firstName?: string;
        lastName?: string;
      };
      const n = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
      return n || 'Employee';
    } catch {
      return 'Employee';
    }
  }

  /** Two-letter avatar for the profile tile. */
  get displayInitials(): string {
    const name = this.displayName.trim();
    if (!name || name === 'Employee') return 'EP';
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  /** Rotates by calendar day. */
  get dailyQuote(): { text: string; author: string } {
    const day = epDashDayOfYear();
    return EP_DASH_QUOTES[day % EP_DASH_QUOTES.length];
  }

  get dailyMotivation(): string {
    const day = epDashDayOfYear();
    return EP_DASH_MOTIVATIONS[(day * 3 + 5) % EP_DASH_MOTIVATIONS.length];
  }

  get dailyTip(): string {
    const day = epDashDayOfYear();
    return EP_DASH_TIPS[(day * 7 + 13) % EP_DASH_TIPS.length];
  }

  /** Master attendance settings + payroll preview from API. */
  get latePolicyVisible(): boolean {
    const p = this.latePayrollPreview;
    return p != null && p['hasSettings'] === true;
  }

  get latePolicyAlertClass(): string {
    const level = String(this.latePayrollPreview?.['alertLevel'] ?? 'none');
    if (level === 'danger') return 'ep-dash-late-policy ep-dash-late-policy--danger';
    if (level === 'warning') return 'ep-dash-late-policy ep-dash-late-policy--warning';
    if (level === 'info') return 'ep-dash-late-policy ep-dash-late-policy--info';
    return 'ep-dash-late-policy ep-dash-late-policy--neutral';
  }

  latePolicyCounts(): Record<string, number> {
    const c = this.latePayrollPreview?.['counts'] as Record<string, number> | undefined;
    return c && typeof c === 'object' ? c : {};
  }

  latePolicySettings(): Record<string, number> {
    const s = this.latePayrollPreview?.['settings'] as Record<string, number> | undefined;
    return s && typeof s === 'object' ? s : {};
  }

  latePolicyDetailLines(): string[] {
    const lines = this.latePayrollPreview?.['detailLines'];
    return Array.isArray(lines) ? (lines as string[]) : [];
  }

  leaveApplicantLabel(row: unknown): string {
    const n = (row as Record<string, unknown>)['employeeName'];
    if (n != null && String(n).trim()) return String(n).trim();
    return this.displayName;
  }

  leaveApplicantInitials(row: unknown): string {
    const name = this.leaveApplicantLabel(row);
    if (!name.trim()) return '?';
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  /** Applicant line for team upcoming rows (API may omit employeeName). */
  upcomingTeamApplicantLabel(row: Record<string, unknown>): string {
    const n = row['employeeName'];
    if (n != null && String(n).trim()) return String(n).trim();
    const id = row['employeeId'];
    if (id != null && String(id) !== '') return `Employee ${String(id)}`;
    return 'Team member';
  }

  upcomingTeamApplicantInitials(row: Record<string, unknown>): string {
    const name = this.upcomingTeamApplicantLabel(row);
    if (!name.trim() || name.startsWith('Employee ')) return 'TM';
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  upcomingLeaveTypeLabel(row: Record<string, unknown>): string {
    const t = row['leaveType'] ?? row['leaveName'];
    return t != null && String(t).trim() ? String(t).trim() : 'Leave';
  }

  trackBalanceRow(index: number, row: Record<string, unknown>): string {
    const code = row['code'];
    const name = row['name'];
    if (code != null && String(code) !== '') return String(code);
    if (name != null && String(name) !== '') return String(name);
    return `bal-${index}`;
  }

  leaveBalanceName(row: Record<string, unknown>): string {
    const n = row['name'];
    return n != null && String(n).trim() ? String(n).trim() : 'Leave';
  }

  leaveBalanceAvailable(row: Record<string, unknown>): number {
    const v = row['available_leave'];
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  leaveBalanceTotal(row: Record<string, unknown>): number {
    const v = row['total_leave'];
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  /** Remaining share of quota (for progress bar). */
  leaveBalanceBarPct(row: Record<string, unknown>): number {
    const total = this.leaveBalanceTotal(row);
    const avail = this.leaveBalanceAvailable(row);
    if (total <= 0) {
      return avail > 0 ? 100 : 0;
    }
    return Math.min(100, Math.max(0, (avail / total) * 100));
  }

  /**
   * Restricted holiday / restricted leave: unused balance expires each calendar year (policy).
   * Matches naming patterns used in payroll (name contains "restricted", or code RH*).
   */
  leaveBalanceIsRestrictedCategory(row: Record<string, unknown>): boolean {
    const name = String(row['name'] ?? '').toLowerCase();
    const code = String(row['code'] ?? '').toLowerCase().trim();
    if (name.includes('restricted')) return true;
    if (code === 'rh' || code.startsWith('rh')) return true;
    return false;
  }

  /** Pill class for leave workflow status (matches employee leave page). */
  leaveStatusPillClass(status: unknown): string {
    const raw = String(status ?? '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '_');
    if (raw === 'approved') return 'ep-dash-status ep-dash-status--ok';
    if (raw === 'pending' || raw === 'recommended') return 'ep-dash-status ep-dash-status--warn';
    if (raw === 'rejected' || raw === 'self_declined') return 'ep-dash-status ep-dash-status--bad';
    if (raw === 'cancelled' || raw === 'canceled') return 'ep-dash-status ep-dash-status--muted';
    return 'ep-dash-status ep-dash-status--neutral';
  }

  trackLeaveRow(index: number, row: unknown): string {
    const r = row as Record<string, unknown>;
    const id = r['id'];
    if (id != null && String(id) !== '') return String(id);
    const k = [r['employeeId'], r['fromDate'], r['toDate'], r['appliedOn']].join('-');
    if (k !== '---') return k;
    return `dash-leave-${index}`;
  }

  get todayLong(): string {
    return new Date().toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  get leavesTableRows(): unknown[] {
    return this.leavesAll.slice(0, 10);
  }

  private leaveStatus(row: unknown): string {
    return String((row as Record<string, unknown>)['status'] ?? '').toLowerCase();
  }

  get leavePendingCount(): number {
    return this.leavesAll.filter((r) => {
      const s = this.leaveStatus(r);
      return s === 'pending' || s === 'recommended';
    }).length;
  }

  get leaveApprovedCount(): number {
    return this.leavesAll.filter((r) => this.leaveStatus(r) === 'approved').length;
  }

  get leaveRejectedCount(): number {
    return this.leavesAll.filter((r) => {
      const s = this.leaveStatus(r);
      return s === 'rejected' || s === 'self_declined';
    }).length;
  }

  get leaveDaysApprovedThisMonth(): number {
    return this.leavesAll
      .filter((r) => this.leaveStatus(r) === 'approved')
      .reduce<number>((sum, r) => sum + Number((r as Record<string, unknown>)['days'] ?? 0), 0);
  }

  get nextHolidaySummary(): { name: string; date: string } | null {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const upcoming = [...this.holidaysRaw]
      .filter((h) => {
        const d = new Date(String(h['date']));
        return !Number.isNaN(+d) && d >= start;
      })
      .sort((a, b) => new Date(String(a['date'])).getTime() - new Date(String(b['date'])).getTime());
    const h = upcoming[0];
    if (!h) return null;
    return { name: String(h['holiday_name'] ?? '—'), date: String(h['date'] ?? '') };
  }

  /** Short line for the holiday KPI “Heads-up” panel. */
  get nextHolidayHeadsUp(): string {
    const nh = this.nextHolidaySummary;
    if (!nh?.name || nh.name === '—') {
      return 'Check the holiday list and plan leave around busy periods.';
    }
    return `Plan time off around ${nh.name} when it fits your workload.`;
  }

  profileLine(key: string): string {
    const v = this.profile?.[key];
    if (v == null || v === '') return '—';
    return String(v);
  }

  holidayTypeLabel(h: Record<string, unknown>): string {
    return String(h['holiday_type_name'] ?? '').trim() || 'Unspecified';
  }

  get uniqueHolidayTypes(): string[] {
    const set = new Set<string>();
    for (const h of this.holidaysRaw) {
      set.add(this.holidayTypeLabel(h));
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }

  /** Nearest dates first; cap length for the small dashboard card */
  get filteredDashboardHolidays(): Record<string, unknown>[] {
    const rows = [...this.holidaysRaw].sort(
      (a, b) => new Date(String(a['date'])).getTime() - new Date(String(b['date'])).getTime(),
    );
    const filtered =
      this.holidayTypeFilter === null
        ? rows
        : rows.filter((h) => this.holidayTypeLabel(h) === this.holidayTypeFilter);
    return filtered.slice(0, 12);
  }

  selectHolidayFilter(type: string | null): void {
    this.holidayTypeFilter = type;
  }

  holidayBadgeClass(type: string): string {
    const t = type.toLowerCase();
    if (t.includes('public')) {
      return 'ep-dash-holiday-badge ep-dash-holiday-badge--public';
    }
    if (t.includes('optional')) {
      return 'ep-dash-holiday-badge ep-dash-holiday-badge--optional';
    }
    if (t.includes('regional')) {
      return 'ep-dash-holiday-badge ep-dash-holiday-badge--regional';
    }
    return 'ep-dash-holiday-badge ep-dash-holiday-badge--default';
  }

   refresh(): void {
    this.loading = true;
    this.chartsLoading = true;
    this.profileLoading = true;
    this.payslipChecked = false;

    this.api.getEmpDetails().subscribe({
      next: (data) => {
        this.profile = data as Record<string, unknown>;
        this.profileLoading = false;
      },
      error: () => {
        this.profile = null;
        this.profileLoading = false;
      },
    });

    this.leaveBalancesLoading = true;
    this.api.getLeaveBalanceList().subscribe({
      next: (rows) => {
        this.leaveBalances = rows;
        this.leaveBalancesLoading = false;
      },
      error: () => {
        this.leaveBalances = [];
        this.leaveBalancesLoading = false;
      },
    });

    this.api.getDailyAttendance().subscribe({
      next: (d) => {
        this.daily = d as Record<string, unknown>;
        this.loading = false;
      },
      error: (err: Error) => {
        this.loading = false;
        this.notyf.error(err.message || 'Could not load attendance.');
      },
    });

    const t = new Date();
    const month = t.getMonth() + 1;
    const year = t.getFullYear();

    this.api.getAppliedLeaves(month, year).subscribe({
      next: (res) => {
        const data = res['data'];
        let rows = res['status'] === true && Array.isArray(data) ? data : [];
        if (this.myEmployeeId) {
          rows = rows.filter(
            (r) => String((r as Record<string, unknown>)['employeeId']) === this.myEmployeeId,
          );
        }
        this.leavesAll = rows;
      },
      error: () => {
        this.leavesAll = [];
      },
    });

    this.upcomingLeavesLoading = true;
    this.api.getUpcomingLeaves(this.yesterdayIsoLocal()).subscribe({
      next: (rows) => {
        const filtered = rows.filter((r) => !this.isUpcomingLeaveExcluded(r));
        const sorted = [...filtered].sort((a, b) => {
          const ta = new Date(String(a['fromDate'])).getTime();
          const tb = new Date(String(b['fromDate'])).getTime();
          return ta - tb;
        });
        const my: Record<string, unknown>[] = [];
        const team: Record<string, unknown>[] = [];
        for (const r of sorted) {
          const eid = String(r['employeeId'] ?? '');
          if (!this.myEmployeeId) {
            my.push(r);
            continue;
          }
          if (eid === this.myEmployeeId) {
            my.push(r);
          } else {
            team.push(r);
          }
        }
        this.upcomingMyLeaves = my.slice(0, 8);
        this.upcomingTeamLeaves = team.slice(0, 8);
        this.upcomingLeavesLoading = false;
      },
      error: () => {
        this.upcomingMyLeaves = [];
        this.upcomingTeamLeaves = [];
        this.upcomingLeavesLoading = false;
      },
    });

    this.api.getBillDetails(month, year).subscribe({
      next: (res) => {
        this.payslipChecked = true;
        const ok = res.status === true;
        const raw = res.data;
        let has = false;
        if (ok && raw != null) {
          if (Array.isArray(raw)) has = raw.length > 0;
          else if (typeof raw === 'object') has = Object.keys(raw as object).length > 0;
          else has = true;
        }
        this.payslipHasData = has;
      },
      error: () => {
        this.payslipChecked = true;
        this.payslipHasData = false;
      },
    });

    this.api.getHolidays().subscribe({
      next: (list) => {
        this.holidaysRaw = Array.isArray(list) ? (list as Record<string, unknown>[]) : [];
        this.holidayTypeFilter = null;
      },
      error: () => {
        this.holidaysRaw = [];
      },
    });

    this.api.getMonthlyAttendance(month, year).subscribe({
      next: (raw: unknown) => {
        const r = raw as {
          AttendanceList?: { data?: Record<string, unknown>[] }[];
          summary?: Record<string, unknown>;
          latePayrollPreview?: Record<string, unknown> | null;
        };
        const rows = r?.AttendanceList?.[0]?.data || [];
        this.attendanceSummary = r?.summary ?? null;
        this.latePayrollPreview = r?.latePayrollPreview ?? null;
        console.log('API Response - latePayrollPreview:', this.latePayrollPreview);
        console.log('latePolicyVisible:', this.latePolicyVisible, 'chartsLoading:', this.chartsLoading);
        this.buildCharts(rows);
        this.chartsLoading = false;
      },
      error: () => {
        this.attendanceSummary = null;
        this.latePayrollPreview = null;
        this.donutOptions = {};
        this.hoursChartOptions = {};
        this.chartsLoading = false;
      },
    });
  }

  private statusBucket(status: string): string {
    const s = status.toLowerCase();
    if (s.includes('holiday')) return 'Holiday';
    if (s.includes('week off')) return 'Week off';
    if (s.includes('on leave') || s.includes('first half') || s.includes('second half')) return 'On leave';
    if (s.includes('absent')) return 'Absent';
    if (s.includes('half day')) return 'Half day';
    if (s.includes('late')) return 'Late';
    if (s.includes('on time')) return 'On time';
    return 'Other';
  }

  private parseDayHours(row: Record<string, unknown>): number | null {
    const checkIn = row['checkIn'];
    const checkOut = row['checkOut'];
    if (checkIn == null || checkOut == null || checkIn === '' || checkOut === '') return null;
    const ci = String(checkIn).trim();
    const co = String(checkOut).trim();
    if (!ci || !co) return null;
    const parse = (t: string) => {
      const p = t.split(':').map((x) => Number(x));
      if (p.length < 2 || p.some((n) => Number.isNaN(n))) return null;
      return p[0] * 60 + p[1];
    };
    const start = parse(ci);
    const end = parse(co);
    if (start == null || end == null) return null;
    let endM = end;
    if (endM < start) endM += 24 * 60;
    const hours = (endM - start) / 60;
    return Math.round(hours * 10) / 10;
  }

  private buildCharts(rows: Record<string, unknown>[]): void {
    const buckets: Record<string, number> = {};
    for (const row of rows) {
      const key = this.statusBucket(String(row['status'] ?? ''));
      buckets[key] = (buckets[key] || 0) + 1;
    }
    const labels = Object.keys(buckets).filter((k) => buckets[k] > 0);
    const series = labels.map((k) => buckets[k]);
    const colors = labels.map((k) => STATUS_BUCKET_COLORS[k] || STATUS_BUCKET_COLORS['Other']);

    if (labels.length === 0) {
      this.donutOptions = {};
    } else {
      this.donutOptions = {
        series,
        chart: {
          type: 'donut',
          height: 300,
          fontFamily: 'inherit',
          toolbar: { show: false },
        },
        labels,
        colors,
        dataLabels: { enabled: false },
        legend: {
          position: 'bottom',
          fontSize: '13px',
          labels: { colors: ['#334155'] },
        },
        plotOptions: {
          pie: {
            donut: {
              size: '62%',
              labels: {
                show: true,
                name: { fontSize: '14px' },
                value: { fontSize: '18px', fontWeight: 600 },
                total: {
                  show: true,
                  label: 'Days',
                  formatter: () => String(rows.length),
                },
              },
            },
          },
        },
        responsive: [
          {
            breakpoint: 576,
            options: {
              chart: { height: 280 },
              legend: { position: 'bottom' },
            },
          },
        ],
      };
    }

    const sorted = [...rows].sort(
      (a, b) => new Date(String(a['date'])).getTime() - new Date(String(b['date'])).getTime(),
    );
    const categories = sorted.map((r) => {
      const d = new Date(String(r['date']));
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    });
    const hoursData = sorted.map((r) => this.parseDayHours(r) ?? 0);

    if (sorted.length === 0) {
      this.hoursChartOptions = {};
    } else {
      this.hoursChartOptions = {
        series: [{ name: 'Hours worked', data: hoursData }],
        chart: {
          type: 'bar',
          height: 300,
          fontFamily: 'inherit',
          toolbar: { show: false },
          zoom: { enabled: false },
        },
        plotOptions: {
          bar: {
            borderRadius: 6,
            columnWidth: '52%',
          },
        },
        dataLabels: { enabled: false },
        xaxis: {
          categories,
          labels: {
            rotate: -35,
            rotateAlways: sorted.length > 12,
            style: { colors: '#64748b', fontSize: '11px' },
          },
          axisBorder: { show: false },
          axisTicks: { show: false },
        },
        yaxis: {
          title: { text: 'Hours', style: { color: '#64748b' } },
          labels: { style: { colors: '#64748b' } },
          min: 0,
        },
        colors: ['#005fa8'],
        grid: {
          borderColor: '#e2e8f0',
          strokeDashArray: 4,
          padding: { left: 8, right: 8 },
        },
      };
    }
  }

  canCheckIn(): boolean {
    if (!this.daily) return false;
    const ci = this.daily['check_in_time'];
    return ci == null || ci === '' || ci === 0;
  }

  canCheckOut(): boolean {
    if (!this.daily) return false;
    const ci = this.daily['check_in_time'];
    const co = this.daily['check_out_time'];
    return !!ci && (co == null || co === '' || co === 0);
  }

  /** Yesterday local YYYY-MM-DD so API `fromDate > date` includes leaves starting today. */
  private yesterdayIsoLocal(): string {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private isUpcomingLeaveExcluded(row: Record<string, unknown>): boolean {
    const s = String(row['status'] ?? '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '_');
    return (
      s === 'rejected' ||
      s === 'self_declined' ||
      s === 'cancelled' ||
      s === 'canceled'
    );
  }

  openLatePolicyModal(): void {
    const el = document.getElementById('latePolicyModal');
    if (el) (window as any).bootstrap.Modal.getOrCreateInstance(el).show();
  }

  closeLatePolicyModal(): void {
    const el = document.getElementById('latePolicyModal');
    if (el) (window as any).bootstrap.Modal.getInstance(el)?.hide();
  }

  mark(): void {
    this.marking = true;
    this.api.markAttendance().subscribe({
      next: () => {
        this.marking = false;
        this.notyf.success('Attendance updated.');
        this.refresh();
      },
      error: (err: Error) => {
        this.marking = false;
        this.notyf.error(err.message || 'Could not mark attendance.');
      },
    });
  }
}
