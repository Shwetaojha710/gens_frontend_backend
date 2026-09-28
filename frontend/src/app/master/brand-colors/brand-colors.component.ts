import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Notyf } from 'notyf';
import { MasterService } from '../../services/master.service';
import { ThemeService, BrandColors, BRAND_DEFAULTS, APPLY_TO_DEFAULTS, ApplyToModules } from '../../services/theme.service';

@Component({
  selector: 'app-brand-colors',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './brand-colors.component.html',
  styleUrl: './brand-colors.component.css',
})
export class BrandColorsComponent implements OnInit {
  colors: Omit<Required<BrandColors>, 'applyTo'> = { ...BRAND_DEFAULTS };
  applyTo: ApplyToModules = { ...APPLY_TO_DEFAULTS };
  saving = false;
  loading = false;
  private notyf = new Notyf();

  constructor(private master: MasterService, private theme: ThemeService) {}

  ngOnInit(): void {
    this.loading = true;
    this.master.getBrandColors().subscribe({
      next: (res: any) => {
        if (res?.status && res.data && Object.keys(res.data).length > 0) {
          this.colors = { ...BRAND_DEFAULTS, ...res.data };
          this.applyTo = { ...APPLY_TO_DEFAULTS, ...(res.data.applyTo || {}) };
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  preview(): void {
    this.theme.applyColors(this.colors);
  }

  save(): void {
    this.saving = true;
    const payload: BrandColors = { ...this.colors, applyTo: this.applyTo };
    this.master.saveBrandColors(payload).subscribe({
      next: () => {
        this.saving = false;
        this.theme.saveToCache(payload);
        this.theme.applyColors(this.colors);
        this.notyf.success('Brand colors saved successfully.');
      },
      error: () => {
        this.saving = false;
        this.notyf.error('Failed to save. Please try again.');
      },
    });
  }

  reset(): void {
    this.colors = { ...BRAND_DEFAULTS };
    this.applyTo = { ...APPLY_TO_DEFAULTS };
    this.theme.applyColors(this.colors);
    this.notyf.success('Colors reset to defaults.');
  }
}
