import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { Notyf } from 'notyf';
import Swal from 'sweetalert2';
import { PerformanceService } from '../../services/performance.service';
import { MasterService } from '../../services/master.service';
import { APPROVAL_LEVEL_OPTIONS, CYCLE_TYPES, approvalLevelLabel, cycleTypeLabel } from '../performance-utils';

const DEFAULT_COMPETENCIES = ['Job Knowledge', 'Quality of Work', 'Communication', 'Teamwork', 'Ownership', 'Problem Solving'];
const MONTHS_BY_TYPE: Record<string, number> = { quarterly: 3, half_yearly: 6, annual: 12 };

/** HR: create, configure, launch and close appraisal cycles. */
@Component({
  selector: 'app-pm-cycles',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NgSelectModule],
  templateUrl: './pm-cycles.component.html',
})
export class PmCyclesComponent implements OnInit {
  private notyf = new Notyf();

  cycles: any[] = [];
  loading = false;
  saving = false;
  form: any = null;
  departmentOptions: { value: string; label: string }[] = [];

  readonly cycleTypes = CYCLE_TYPES;
  readonly approvalOptions = APPROVAL_LEVEL_OPTIONS;
  readonly cycleTypeLabel = cycleTypeLabel;
  readonly approvalLevelLabel = approvalLevelLabel;

  constructor(private api: PerformanceService, private master: MasterService) {}

  ngOnInit(): void {
    this.load();
    this.master.Departmentsdd({}).subscribe({
      next: (res: any) => {
        if (res?.status === true && Array.isArray(res.data)) this.departmentOptions = res.data;
      },
    });
  }

  load(): void {
    this.loading = true;
    this.api.listCycles().subscribe({
      next: (res: any) => {
        this.loading = false;
        this.cycles = res?.status === true ? res.data : [];
      },
      error: () => (this.loading = false),
    });
  }

  get weightTotal(): number {
    if (!this.form) return 0;
    return Number(this.form.weightGoals || 0) + Number(this.form.weightManager || 0) + Number(this.form.weightFeedback || 0);
  }

  openForm(cycle?: any): void {
    this.form = cycle
      ? {
          ...cycle,
          competenciesText: (cycle.competencies || []).join('\n'),
          approvalLevels: [...(cycle.approvalLevels || ['hr'])],
          departmentIds: cycle.departmentIds || [],
          allBranches: !cycle.branchId,
        }
      : {
          name: '',
          cycleType: 'annual',
          startDate: '',
          endDate: '',
          goalSettingDeadline: '',
          selfReviewDeadline: '',
          feedbackDeadline: '',
          managerReviewDeadline: '',
          weightGoals: 50,
          weightManager: 30,
          weightFeedback: 20,
          competenciesText: DEFAULT_COMPETENCIES.join('\n'),
          approvalLevels: ['hr'],
          departmentIds: [],
          allBranches: false,
          status: 'draft',
        };
  }

  /** Fill the end date from the cycle type when a start date is picked. */
  onPeriodChange(): void {
    const months = MONTHS_BY_TYPE[this.form?.cycleType];
    if (!months || !this.form.startDate) return;
    const d = new Date(this.form.startDate);
    d.setMonth(d.getMonth() + months);
    d.setDate(d.getDate() - 1);
    this.form.endDate = d.toISOString().slice(0, 10);
  }

  toggleLevel(level: string, checked: boolean): void {
    const set = new Set<string>(this.form.approvalLevels);
    checked ? set.add(level) : set.delete(level);
    // keep chain order: skip-level manager before HR
    this.form.approvalLevels = this.approvalOptions.map((o) => o.value).filter((v) => set.has(v));
  }

  save(): void {
    const payload = {
      ...this.form,
      competencies: String(this.form.competenciesText || '')
        .split('\n')
        .map((s: string) => s.trim())
        .filter(Boolean),
    };
    this.saving = true;
    this.api.saveCycle(payload).subscribe({
      next: (res: any) => {
        this.saving = false;
        if (res?.status === true) {
          this.notyf.success(res.message);
          this.form = null;
          this.load();
        } else this.notyf.error(res?.message || 'Unable to save');
      },
      error: () => {
        this.saving = false;
        this.notyf.error('Unable to save');
      },
    });
  }

  private async confirmThen(title: string, text: string, call: () => any): Promise<void> {
    const ok = await Swal.fire({ title, text, icon: 'question', showCancelButton: true, confirmButtonText: 'Yes' });
    if (!ok.isConfirmed) return;
    call().subscribe({
      next: (res: any) => {
        res?.status === true ? this.notyf.success(res.message) : this.notyf.error(res?.message || 'Failed');
        this.load();
      },
      error: () => this.notyf.error('Request failed'),
    });
  }

  launch(c: any): void {
    const text =
      c.status === 'draft'
        ? 'Creates a review for every active employee in scope and opens goal setting. Weights, competencies and approval levels are locked after launch.'
        : 'Adds reviews for employees who joined or entered scope since launch.';
    this.confirmThen(c.status === 'draft' ? `Launch "${c.name}"?` : 'Sync employees?', text, () => this.api.launchCycle(c.id));
  }

  close(c: any): void {
    this.confirmThen(`Close "${c.name}"?`, 'All reviews become read-only. Unfinished reviews stay unfinished.', () => this.api.closeCycle(c.id));
  }

  remove(c: any): void {
    this.confirmThen(`Delete "${c.name}"?`, 'This draft cycle will be removed.', () => this.api.deleteCycle(c.id));
  }
}
