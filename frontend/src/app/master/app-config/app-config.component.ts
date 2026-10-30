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

  load(): void {
    this.loading = true;
    this.master.getAppConfig().subscribe({
      next: (res: any) => {
        this.loading = false;
        if (!res?.status) {
          this.notyf.error(res?.message || 'Failed to load app config.');
          return;
        }
        const data = res.data || {};
        // New shape: { fields, values } — legacy: flat imageQuality
        if (Array.isArray(data.fields)) {
          this.fields = data.fields;
          this.values = { ...(data.values || {}) };
          for (const f of this.fields) {
            if (this.values[f.key] == null || this.values[f.key] === '') {
              this.values[f.key] = f.defaultValue ?? '';
            }
          }
        } else if (data.imageQuality != null) {
          this.fields = [
            {
              key: 'imageQuality',
              label: 'Image quality',
              hint: 'Higher values keep more detail and larger files.',
              fieldType: 'range',
              minValue: data.minImageQuality ?? 30,
              maxValue: data.maxImageQuality ?? 100,
              step: 1,
              defaultValue: '80',
              unit: '%',
              options: [],
              tips: [],
              sortOrder: 10,
            },
          ];
          this.values = { imageQuality: String(data.imageQuality) };
        } else {
          this.fields = [];
          this.values = {};
        }
      },
      error: () => {
        this.loading = false;
        this.notyf.error('Failed to load app config.');
      },
    });
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
    this.master.saveAppConfig({ values: payload }).subscribe({
      next: (res: any) => {
        this.saving = false;
        if (res?.status) {
          if (res.data?.values) this.values = { ...res.data.values };
          if (Array.isArray(res.data?.fields)) this.fields = res.data.fields;
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
  }
}
