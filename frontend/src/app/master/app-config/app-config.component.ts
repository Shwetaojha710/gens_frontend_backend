import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Notyf } from 'notyf';
import { MasterService } from '../../services/master.service';

export interface AppConfigFieldDef {
  key: string;
  label: string;
  hint: string;
  fieldType: 'range' | 'number' | 'text' | 'boolean' | 'select' | string;
  minValue: number | null;
  maxValue: number | null;
  step: number;
  defaultValue: string;
  unit: string;
  options: { value: string; label: string }[];
  tips: string[];
  sortOrder: number;
}

@Component({
  selector: 'app-app-config',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app-config.component.html',
  styleUrl: './app-config.component.css',
})
export class AppConfigComponent implements OnInit {
  fields: AppConfigFieldDef[] = [];
  values: Record<string, string> = {};
  branches: { id: string; name: string }[] = [];
  /** null = All branches (tenant default) */
  selectedBranchId: string | null = null;
  /** Enable custom config for the selected branch */
  isEnabled = true;
  enabledBranchIds: string[] = [];
  loading = false;
  saving = false;
  private notyf = new Notyf();

  constructor(private master: MasterService) {}

  ngOnInit(): void {
    this.load();
  }

  get sidebarTips(): string[] {
    const tips: string[] = [];
    for (const f of this.fields) {
      if (Array.isArray(f.tips)) tips.push(...f.tips);
    }
    return tips;
  }

  get selectedBranchLabel(): string {
    if (!this.selectedBranchId) return 'All branches';
    return this.branches.find((b) => b.id === this.selectedBranchId)?.name || 'Branch';
  }

  isBranchEnabledInList(id: string): boolean {
    return this.enabledBranchIds.includes(id);
  }

  branchName(id: string): string {
    return this.branches.find((b) => b.id === id)?.name || id;
  }

  load(): void {
    this.loading = true;
    this.master.getAppConfig({ branchId: this.selectedBranchId }).subscribe({
      next: (res: any) => {
        this.loading = false;
        if (!res?.status) {
          this.notyf.error(res?.message || 'Failed to load app config.');
          return;
        }
        this.applyPayload(res.data || {});
      },
      error: () => {
        this.loading = false;
        this.notyf.error('Failed to load app config.');
      },
    });
  }

  onBranchChange(): void {
    this.load();
  }

  private applyPayload(data: any): void {
    if (Array.isArray(data.branches)) {
      this.branches = data.branches.map((b: any) => ({
        id: b.id,
        name: b.name || b.id,
      }));
    }
    this.enabledBranchIds = Array.isArray(data.enabledBranchIds) ? data.enabledBranchIds : [];
    this.isEnabled = data.isEnabled !== false;

    if (Array.isArray(data.fields)) {
      this.fields = data.fields;
      this.values = { ...(data.values || {}) };
      for (const f of this.fields) {
        if (this.values[f.key] == null || this.values[f.key] === '') {
          this.values[f.key] = f.defaultValue ?? '';
        }
      }
    } else {
      this.fields = [];
      this.values = {};
    }
  }

  displayNumber(field: AppConfigFieldDef): string {
    const n = Number(this.values[field.key]);
    return Number.isFinite(n) ? String(n) : field.defaultValue || '0';
  }

  onRangeChange(field: AppConfigFieldDef, raw: string | number): void {
    this.values[field.key] = this.clampNumber(field, raw);
  }

  onTextChange(field: AppConfigFieldDef, raw: string): void {
    this.values[field.key] = raw ?? '';
  }

  onBoolChange(field: AppConfigFieldDef, checked: boolean): void {
    this.values[field.key] = checked ? 'true' : 'false';
  }

  isBoolOn(field: AppConfigFieldDef): boolean {
    const v = String(this.values[field.key] ?? '').toLowerCase();
    return v === 'true' || v === '1' || v === 'yes';
  }

  private clampNumber(field: AppConfigFieldDef, raw: string | number): string {
    let n = Number(raw);
    if (!Number.isFinite(n)) n = Number(field.defaultValue) || 0;
    n = Math.round(n);
    if (field.minValue != null) n = Math.max(Number(field.minValue), n);
    if (field.maxValue != null) n = Math.min(Number(field.maxValue), n);
    return String(n);
  }

  save(): void {
    const payload: Record<string, string> = {};
    for (const f of this.fields) {
      if (f.fieldType === 'range' || f.fieldType === 'number') {
        payload[f.key] = this.clampNumber(f, this.values[f.key]);
        this.values[f.key] = payload[f.key];
      } else if (f.fieldType === 'boolean') {
        payload[f.key] = this.isBoolOn(f) ? 'true' : 'false';
        this.values[f.key] = payload[f.key];
      } else {
        payload[f.key] = this.values[f.key] ?? f.defaultValue ?? '';
      }
    }

    this.saving = true;
    this.master
      .saveAppConfig({
        branchId: this.selectedBranchId,
        isEnabled: this.isEnabled,
        values: payload,
      })
      .subscribe({
        next: (res: any) => {
          this.saving = false;
          if (res?.status) {
            this.applyPayload(res.data || {});
            this.notyf.success(res.message || 'App config saved.');
          } else {
            this.notyf.error(res?.message || 'Could not save.');
          }
        },
        error: () => {
          this.saving = false;
          this.notyf.error('Failed to save. Please try again.');
        },
      });
  }

  reset(): void {
    for (const f of this.fields) {
      this.values[f.key] = f.defaultValue ?? '';
    }
    if (this.selectedBranchId) this.isEnabled = true;
  }
}
