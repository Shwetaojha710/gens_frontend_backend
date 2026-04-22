import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { JobService } from '../../services/job.service';
import { StatusService } from '../../services/status.service';
import { CandidateApplicationRecord, RecruitmentStageKey } from '../recruitment.models';

interface StageSlice {
  key: string;
  label: string;
  value: number;
  color: string;
  // SVG donut fields
  path?: string;
  pct?: number;
}

interface RecentAppRow {
  id: string;
  shortId: string;
  name: string;
  jobTitle: string;
  stage: string;
  stageLabel: string;
  applied: string;
}

interface TopOpenJobRow {
  title: string;
  code: string;
}

interface InterviewSoon {
  name: string;
  jobTitle: string;
  when: string;
  sortKey: number;
}

@Component({
  selector: 'app-recuiter-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './recuiter-dashboard.component.html',
  styleUrl: './recuiter-dashboard.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecuiterDashboardComponent implements OnInit {
  loading = true;
  jobs: any[] = [];
  applications: CandidateApplicationRecord[] = [];

  openRoles = 0;
  totalCandidates = 0;
  interviewsActive = 0;
  offersOut = 0;
  hiredClosed = 0;
  newThisWeek = 0;

  stageSlices: StageSlice[] = [];
  donutGradient = 'conic-gradient(#e2e8f0 0% 100%)';

  deptBars: { label: string; raw: string; count: number; pct: number }[] = [];

  recentRows: RecentAppRow[] = [];
  upcomingInterviews: InterviewSoon[] = [];
  topOpenJobs: TopOpenJobRow[] = [];

  selectedApp: CandidateApplicationRecord | null = null;
  loadingDetail = false;
  hoveredSlice: StageSlice | null = null;

  // Date filter
  filterFrom = '';
  filterTo = '';
  allApplications: CandidateApplicationRecord[] = [];
  dateFilterOpen = false;
  dateError: 'from_future' | 'to_future' | 'range' | null = null;
  readonly today = new Date().toISOString().split('T')[0];

  readonly stageOrder: { key: RecruitmentStageKey; label: string; color: string }[] = [
    { key: 'candidate_applied', label: 'Applied', color: '#209af7' },
    { key: 'ats_screening', label: 'ATS / Screening', color: '#6366f1' },
    { key: 'shortlisted', label: 'Shortlisted', color: '#8b5cf6' },
    { key: 'interview_scheduled', label: 'Interview due', color: '#f59e0b' },
    { key: 'interview_in_progress', label: 'Interview live', color: '#ea580c' },
    { key: 'offered', label: 'Offered', color: '#22c55e' },
    { key: 'closed', label: 'Closed / Hired', color: '#0d9488' },
    { key: 'rejected', label: 'Rejected', color: '#94a3b8' },
    { key: 'job_requirement', label: 'Requirement', color: '#cbd5e1' },
    { key: 'posting', label: 'Posting', color: '#94a3b8' },
  ];

  constructor(
    private jobService: JobService,
    private statusService: StatusService,
    private cdr: ChangeDetectorRef,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.cdr.markForCheck();
     let obj={}
    forkJoin({
      jobs: this.jobService.getJobRequirements(obj).pipe(
        catchError(() => of({ status: false, data: [] })),
      ),
      pipeline: this.jobService.getCandidatePipeline({}).pipe(
        catchError(() => of({ status: false, data: [] })),
      ),
    }).subscribe({
      next: ({ jobs, pipeline }) => {
        const p = pipeline as any;
        if (p.status == 'expired') {
          this.statusService.handleResponseStatus('expired', 'Session expired');
          this.loading = false;
          this.cdr.markForCheck();
          return;
        }

        this.jobs = (jobs as any).status == true ? (jobs as any).data || [] : [];
        this.allApplications = p.status == true ? p.data || [] : [];
        this.applyDateFilter();
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  onFromChange(): void {
    this.dateError = null;
    if (this.filterFrom && this.filterFrom > this.today) {
      this.dateError = 'from_future';
      return;
    }
    if (this.filterFrom && this.filterTo && this.filterFrom > this.filterTo) {
      this.dateError = 'range';
    }
  }

  onToChange(): void {
    this.dateError = null;
    if (this.filterTo && this.filterTo > this.today) {
      this.dateError = 'to_future';
      return;
    }
    if (this.filterFrom && this.filterTo && this.filterFrom > this.filterTo) {
      this.dateError = 'range';
    }
  }

  applyDateFilter(): void {
    if (this.dateError) return;
    if (!this.filterFrom && !this.filterTo) {
      this.applications = [...this.allApplications];
    } else {
      const from = this.filterFrom ? new Date(this.filterFrom).setHours(0, 0, 0, 0) : 0;
      const to = this.filterTo ? new Date(this.filterTo).setHours(23, 59, 59, 999) : Infinity;
      this.applications = this.allApplications.filter((a) => {
        const t = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        return t >= from && t <= to;
      });
    }
    this.computeAll();
    this.dateFilterOpen = false;
    this.cdr.markForCheck();
  }

  clearDateFilter(): void {
    this.filterFrom = '';
    this.filterTo = '';
    this.dateError = null;
    this.applications = [...this.allApplications];
    this.computeAll();
    this.dateFilterOpen = false;
    this.cdr.markForCheck();
  }

  get dateLabel(): string {
    if (this.filterFrom && this.filterTo) return `${this.filterFrom} → ${this.filterTo}`;
    if (this.filterFrom) return `From ${this.filterFrom}`;
    if (this.filterTo) return `Until ${this.filterTo}`;
    return 'All Time';
  }

  private computeAll(): void {
    this.openRoles = this.jobs.filter((j) => this.isJobOpen(j)).length;
    this.totalCandidates = this.applications.length;

    this.interviewsActive = this.applications.filter((a) =>
      ['interview_scheduled', 'interview_in_progress'].includes(a.stage),
    ).length;

    this.offersOut = this.applications.filter((a) => a.stage === 'offered').length;
    this.hiredClosed = this.applications.filter((a) => a.stage === 'closed').length;

    const weekAgo = Date.now() - 7 * 86400000;
    this.newThisWeek = this.applications.filter((a) => {
      const t = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      return t >= weekAgo;
    }).length;

    this.buildStageSlices();
    this.buildDeptBars();
    this.buildRecent();
    this.buildUpcomingInterviews();
    this.buildTopOpenJobs();
  }

  private buildTopOpenJobs(): void {
    this.topOpenJobs = this.jobs
      .filter((j) => this.isJobOpen(j))
      .slice(0, 5)
      .map((j) => ({
        title: String(j.job_title || j.title || j.designation_name || j.role_name || 'Open role').trim(),
        code: String(j.job_code || j.company_job_code || j.id || '')
          .replace(/-/g, '')
          .slice(0, 10)
          .toUpperCase() || '—',
      }));
  }

  private isJobOpen(j: any): boolean {
    const s = String(j?.status || j?.job_status || '').toLowerCase();
    return s == 'open' || s == 'active' || s == 'published' || j?.is_published == true || j?.published == true;
  }

  private buildStageSlices(): void {
    const counts = new Map<string, number>();
    for (const a of this.applications) {
      const k = a.stage || 'candidate_applied';
      counts.set(k, (counts.get(k) || 0) + 1);
    }

    this.stageSlices = this.stageOrder
      .map((s) => ({
        key: s.key,
        label: s.label,
        value: counts.get(s.key) || 0,
        color: s.color,
      }))
      .filter((x) => x.value > 0);

    const total = this.stageSlices.reduce((sum, x) => sum + x.value, 0) || 1;

    // Build SVG arc paths (cx=60,cy=60,r=46,innerR=30)
    const cx = 60, cy = 60, r = 46, gap = 0.03;
    let startAngle = -Math.PI / 2;
    const parts: string[] = [];

    for (const s of this.stageSlices) {
      const pct = s.value / total;
      s.pct = Math.round(pct * 100);
      const sweep = pct * 2 * Math.PI - gap;
      const endAngle = startAngle + sweep;
      const x1 = cx + r * Math.cos(startAngle);
      const y1 = cy + r * Math.sin(startAngle);
      const x2 = cx + r * Math.cos(endAngle);
      const y2 = cy + r * Math.sin(endAngle);
      const largeArc = sweep > Math.PI ? 1 : 0;
      // outer arc → inner arc back
      const ir = 28;
      const xi1 = cx + ir * Math.cos(endAngle);
      const yi1 = cy + ir * Math.sin(endAngle);
      const xi2 = cx + ir * Math.cos(startAngle);
      const yi2 = cy + ir * Math.sin(startAngle);
      s.path = `M${x1},${y1} A${r},${r} 0 ${largeArc},1 ${x2},${y2} L${xi1},${yi1} A${ir},${ir} 0 ${largeArc},0 ${xi2},${yi2} Z`;
      startAngle += pct * 2 * Math.PI;

      // keep conic-gradient for fallback
      parts.push(`${s.color} ${((startAngle + Math.PI / 2) / (2 * Math.PI)) * 100}%`);
    }
    this.donutGradient = parts.length ? `conic-gradient(${parts.join(', ')})` : 'conic-gradient(#e2e8f0 0% 100%)';
  }

  private buildDeptBars(): void {
    const map = new Map<string, number>();
    for (const a of this.applications) {
      const label = (a.department || a.job_title || 'General').trim() || 'General';
      map.set(label, (map.get(label) || 0) + 1);
    }
    const entries = [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
    const max = Math.max(...entries.map((e) => e[1]), 1);
    this.deptBars = entries.map(([label, count]) => ({
      raw: label,
      label: label.length > 28 ? label.slice(0, 26) + '…' : label,
      count,
      pct: Math.round((count / max) * 100),
    }));
  }

  private stageLabel(stage: string): string {
    const f = this.stageOrder.find((s) => s.key === stage);
    return f?.label || stage.replace(/_/g, ' ');
  }

  private buildRecent(): void {
    const sorted = [...this.applications].sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });
    this.recentRows = sorted.slice(0, 8).map((a) => ({
      id: a.id,
      shortId: a.id
        ? String(a.id)
            .replace(/-/g, '')
            .slice(-10)
            .toUpperCase()
        : '—',
      name: a.name || '—',
      jobTitle: a.job_title || '—',
      stage: a.stage,
      stageLabel: this.stageLabel(a.stage),
      applied: a.createdAt ? this.formatShortDate(a.createdAt) : '—',
    }));
  }

  private formatShortDate(iso: string): string {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return '—';
    }
  }

  private buildUpcomingInterviews(): void {
    const out: InterviewSoon[] = [];
    const now = Date.now();
    for (const a of this.applications) {
      const rounds = a.interview_rounds || [];
      for (const r of rounds) {
        if (!r.scheduled_at || r.status === 'cancelled') continue;
        const t = new Date(r.scheduled_at).getTime();
        if (t < now) continue;
        out.push({
          name: a.name || 'Candidate',
          jobTitle: a.job_title || '',
          when: this.formatShortDate(r.scheduled_at) + (r.round_name ? ` · ${r.round_name}` : ''),
          sortKey: t,
        });
      }
    }
    out.sort((a, b) => a.sortKey - b.sortKey);
    this.upcomingInterviews = out.slice(0, 5);
  }

  viewApplication(row: RecentAppRow): void {
    this.loadingDetail = true;
    this.selectedApp = null;
    this.cdr.markForCheck();
    const el = document.getElementById('rdCandidateModal');
    if (el) (window as any).bootstrap.Modal.getOrCreateInstance(el).show();

    this.jobService.getCandidateApplicationById(row.id).subscribe({
      next: (res) => {
        if (res?.status) {
          this.selectedApp = res.data;
        }
        this.loadingDetail = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loadingDetail = false;
        this.cdr.markForCheck();
      }
    });
  }

  closeModal(): void {
    const el = document.getElementById('rdCandidateModal');
    if (el) (window as any).bootstrap.Modal.getInstance(el)?.hide();
    this.selectedApp = null;
    this.cdr.markForCheck();
  }

  openPipeline(): void {
    const el = document.getElementById('rdCandidateModal');
    const modal = el ? (window as any).bootstrap.Modal.getInstance(el) : null;
    if (modal) {
      el!.addEventListener('hidden.bs.modal', () => {
        this.router.navigate(['/recruitment/application-list']);
      }, { once: true });
      modal.hide();
    } else {
      this.router.navigate(['/recruitment/application-list']);
    }
    this.selectedApp = null;
    this.cdr.markForCheck();
  }

  getSlicePct(value: number): number {
    if (!this.totalCandidates) return 0;
    return Math.round((value / this.totalCandidates) * 100);
  }

  navigateToStage(stage: string): void {
    const extras = stage ? { queryParams: { stage } } : {};
    this.router.navigate(['/recruitment/application-list'], extras);
  }

  stagePillClass(stage: string): string {
    if (stage === 'offered' || stage === 'closed') return 'rd-pill-stage--success';
    if (stage === 'rejected') return 'rd-pill-stage--muted';
    if (stage?.includes('interview')) return 'rd-pill-stage--warn';
    return 'rd-pill-stage--primary';
  }
}
