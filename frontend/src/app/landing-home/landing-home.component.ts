import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Notyf } from 'notyf';
import { ViewEncapsulation } from '@angular/core';
import { MasterService } from '../services/master.service';
import { ThemeService, BrandColors, BRAND_DEFAULTS, APPLY_TO_DEFAULTS, ApplyToModules } from '../services/theme.service';

@Component({
  selector: 'app-landing-home',
  imports: [CommonModule, FormsModule],
  standalone: true,
  templateUrl: './landing-home.component.html',
  styleUrls: ['./landing-home.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class LandingHomeComponent {
  notyf: Notyf = new Notyf();
  branchList: any;
  obj: any = {};
  stats: any = [];
  tenantDetails: any = {};
  baseurl: any;

  // Settings drawer state
  settingsOpen = false;
  settingsLoaded = false;
  saving = false;
  colors: Omit<Required<BrandColors>, 'applyTo'> = { ...BRAND_DEFAULTS };
  applyTo: ApplyToModules = { ...APPLY_TO_DEFAULTS };

  constructor(
    private router: Router,
    public masterService: MasterService,
    private theme: ThemeService,
  ) {
    this.baseurl = this.masterService.getBaseUrl();
    this.tenantDetails = JSON.parse(localStorage.getItem('tenant') || '{}');
    this.tenantDetails.image = `${this.baseurl}${this.tenantDetails['image']}`;
  }

  goToOnboarding() {
    this.router.navigate(['recruitment/recruitment-dashboard']);
  }

  goToEmployeeManagement() {
    this.router.navigate(['layout/dashboard']);
  }

  goToTracking() {
    this.router.navigate(['layout/tracking']);
  }

  // ── Settings drawer ──────────────────────────────────────

  openSettings(): void {
    this.settingsOpen = true;
    if (!this.settingsLoaded) {
      this.loadSettings();
    }
  }

  closeSettings(): void {
    this.settingsOpen = false;
  }

  loadSettings(): void {
    // Load from cache first for instant display
    const cached = this.theme.getCached();
    if (cached) {
      this.colors = { ...BRAND_DEFAULTS, ...cached };
      this.applyTo = { ...APPLY_TO_DEFAULTS, ...(cached.applyTo || {}) };
    }

    // Refresh from API
    this.masterService.getBrandColors().subscribe({
      next: (res: any) => {
        if (res?.status && res.data && Object.keys(res.data).length > 0) {
          this.colors = { ...BRAND_DEFAULTS, ...res.data };
          this.applyTo = { ...APPLY_TO_DEFAULTS, ...(res.data.applyTo || {}) };
        }
        this.settingsLoaded = true;
      },
      error: () => {
        this.settingsLoaded = true;
      },
    });
  }

  previewColors(): void {
    this.theme.applyColors(this.colors);
  }

  saveSettings(): void {
    this.saving = true;
    const payload: BrandColors = { ...this.colors, applyTo: this.applyTo };
    this.masterService.saveBrandColors(payload).subscribe({
      next: () => {
        this.saving = false;
        this.theme.saveToCache(payload);
        this.theme.applyColors(this.colors);
        this.notyf.success('Brand colors saved successfully.');
      },
      error: () => {
        this.saving = false;
        this.notyf.error('Save failed. Please make sure you are logged in as admin.');
      },
    });
  }

  resetSettings(): void {
    this.colors = { ...BRAND_DEFAULTS };
    this.applyTo = { ...APPLY_TO_DEFAULTS };
    this.theme.applyColors(this.colors);
    this.notyf.success('Colors reset to defaults.');
  }
}
