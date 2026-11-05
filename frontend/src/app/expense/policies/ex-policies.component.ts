import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { Notyf } from 'notyf';
import Swal from 'sweetalert2';
import { ExpenseService } from '../../services/expense.service';
import { MasterService } from '../../services/master.service';
import { APPROVAL_LEVELS, fmtMoney, levelLabel } from '../expense-utils';

type Tab = 'categories' | 'rules' | 'settings';

/** HR: expense categories with spending policy, conditional approval rules and workflow settings. */
@Component({
  selector: 'app-ex-policies',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectModule],
  templateUrl: './ex-policies.component.html',
})
export class ExPoliciesComponent implements OnInit {
  private notyf = new Notyf();

  tab: Tab = 'categories';
  categories: any[] = [];
  rules: any[] = [];
  settings: any = null;
  employeeOptions: any[] = [];
  saving = false;

  categoryForm: any = null;
  ruleForm: any = null;

  readonly levels = APPROVAL_LEVELS;
  readonly fmtMoney = fmtMoney;
  readonly levelLabel = levelLabel;

  constructor(private api: ExpenseService, private master: MasterService) {}

  ngOnInit(): void {
    this.loadCategories();
    this.loadRules();
    this.api.getSettings().subscribe((res: any) => (this.settings = res?.data || null));
    this.master.getemployeeList().subscribe((res: any) => {
      this.employeeOptions = res?.status === true ? res.data.filter((o: any) => o.value && o.value !== 'All') : [];
    });
  }

  loadCategories(): void {
    this.api.listCategories().subscribe((res: any) => (this.categories = res?.data || []));
  }

  loadRules(): void {
    this.api.listRules().subscribe((res: any) => (this.rules = res?.data || []));
  }

  categoryName(id: string | null): string {
    return id ? this.categories.find((c) => c.id === id)?.name || '—' : 'Any category';
  }

  private save(obs: any, after: () => void): void {
    this.saving = true;
    obs.subscribe({
      next: (res: any) => {
        this.saving = false;
        if (res?.status === true) {
          this.notyf.success(res.message);
          after();
        } else this.notyf.error(res?.message || 'Unable to save');
      },
      error: () => {
        this.saving = false;
        this.notyf.error('Unable to save');
      },
    });
  }

  // ── Categories ──
  openCategory(c?: any): void {
    this.categoryForm = c
      ? { ...c }
      : { name: '', code: '', description: '', perClaimLimit: null, monthlyLimit: null, receiptRequiredAbove: 0, maxAgeDays: 60, limitAction: 'flag', status: 'active' };
  }

  saveCategory(): void {
    this.save(this.api.saveCategory(this.categoryForm), () => {
      this.categoryForm = null;
      this.loadCategories();
    });
  }

  toggleCategory(c: any): void {
    this.save(this.api.saveCategory({ ...c, status: c.status === 'active' ? 'inactive' : 'active' }), () => this.loadCategories());
  }

  // ── Rules ──
  openRule(r?: any): void {
    this.ruleForm = r
      ? { ...r, levels: [...r.levels] }
      : { name: '', categoryId: null, minAmount: 0, maxAmount: null, levels: ['manager', 'finance'], priority: 0, status: 'active' };
  }

  toggleRuleLevel(level: string, checked: boolean): void {
    const set = new Set<string>(this.ruleForm.levels);
    checked ? set.add(level) : set.delete(level);
    this.ruleForm.levels = this.levels.map((l) => l.value).filter((v) => set.has(v));
  }

  saveRule(): void {
    this.save(this.api.saveRule(this.ruleForm), () => {
      this.ruleForm = null;
      this.loadRules();
    });
  }

  async deleteRule(r: any): Promise<void> {
    const ok = await Swal.fire({ title: `Delete rule "${r.name}"?`, icon: 'warning', showCancelButton: true, confirmButtonText: 'Delete' });
    if (ok.isConfirmed) this.save(this.api.deleteRule(r.id), () => this.loadRules());
  }

  // ── Settings ──
  toggleDefaultLevel(level: string, checked: boolean): void {
    const set = new Set<string>(this.settings.defaultLevels);
    checked ? set.add(level) : set.delete(level);
    this.settings.defaultLevels = this.levels.map((l) => l.value).filter((v) => set.has(v));
  }

  saveSettings(): void {
    this.save(this.api.saveSettings(this.settings), () => {});
  }
}
