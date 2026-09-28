import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface ApplyToModules {
  hrAdmin: boolean;
  recruitment: boolean;
  employeePortal: boolean;
}

export interface BrandColors {
  primaryColor?: string;
  /** @deprecated kept for backward compatibility — use sidebarTop/sidebarBottom */
  sidebarColor?: string;
  sidebarTop?: string;
  sidebarBottom?: string;
  navActiveStart?: string;
  navActiveEnd?: string;
  promoCardBg?: string;
  promoTitleColor?: string;
  pageBgStart?: string;
  pageBgEnd?: string;
  heroBgStart?: string;
  heroBgEnd?: string;
  buttonColor?: string;
  buttonHoverColor?: string;
  landingBgStart?: string;
  landingBgEnd?: string;
  loginBgStart?: string;
  loginBgEnd?: string;
  loginButtonColor?: string;
  applyTo?: ApplyToModules;
}

export interface SAColors {
  sidebarBg?: string;
  shellBg?: string;
  accentColor?: string;
}

export const BRAND_DEFAULTS: Omit<Required<BrandColors>, 'applyTo'> = {
  primaryColor: '#00d2b4',
  sidebarColor: '#003b5c',
  sidebarTop: '#003b5c',
  sidebarBottom: '#008e9b',
  navActiveStart: '#0081c9',
  navActiveEnd: '#00d2b4',
  promoCardBg: '#0d486b',
  promoTitleColor: '#00d2b4',
  pageBgStart: '#eaf1f6',
  pageBgEnd: '#dfe9f0',
  heroBgStart: '#0f3d4c',
  heroBgEnd: '#00b4a6',
  buttonColor: '#00b4a6',
  buttonHoverColor: '#008f84',
  landingBgStart: '#d6e4f0',
  landingBgEnd: '#fff1eb',
  loginBgStart: '#fff5f5',
  loginBgEnd: '#eaf1f6',
  loginButtonColor: '#00b4a6',
};

export const SA_DEFAULTS: Required<SAColors> = {
  sidebarBg: '#0f172a',
  shellBg: '#f6f7fb',
  accentColor: '#696cff',
};

export const APPLY_TO_DEFAULTS: ApplyToModules = {
  hrAdmin: true,
  recruitment: true,
  employeePortal: true,
};

const CACHE_KEY = 'app_brand_colors';
const SA_CACHE_KEY = 'sa_brand_colors';

type AppModule = 'hrAdmin' | 'recruitment' | 'employeePortal' | 'superadmin' | 'landing';

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const h = hex.replace('#', '');
  if (h.length !== 6) return null;
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function getModuleFromUrl(url: string): AppModule {
  if (url.startsWith('/superadmin')) return 'superadmin';
  if (url.startsWith('/layout')) return 'hrAdmin';
  if (url.startsWith('/recruitment')) return 'recruitment';
  if (url.startsWith('/employee-portal')) return 'employeePortal';
  return 'landing';
}

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ── Tenant brand colors ──────────────────────────────

  applyColors(colors: BrandColors): void {
    const c = { ...BRAND_DEFAULTS, ...colors };
    const root = document.documentElement;

    root.style.setProperty('--app-primary', c.primaryColor);
    root.style.setProperty('--app-button', c.buttonColor);
    root.style.setProperty('--app-button-hover', c.buttonHoverColor);

    const pr = hexToRgb(c.primaryColor);
    if (pr) {
      root.style.setProperty('--app-primary-subtle', `rgba(${pr.r}, ${pr.g}, ${pr.b}, 0.12)`);
    }

    root.style.setProperty('--app-nav-active-start', c.navActiveStart);
    root.style.setProperty('--app-nav-active-end', c.navActiveEnd);
    root.style.setProperty('--app-nav-active-bg', `linear-gradient(90deg, ${c.navActiveStart} 0%, ${c.navActiveEnd} 100%)`);

    const sidebarTop = c.sidebarTop || c.sidebarColor;
    const sidebarBottom = c.sidebarBottom || c.sidebarColor;
    root.style.setProperty('--app-sidebar-top', sidebarTop);
    root.style.setProperty('--app-sidebar-bottom', sidebarBottom);
    root.style.setProperty('--app-sidebar-bg', `linear-gradient(180deg, ${sidebarTop} 0%, ${sidebarBottom} 100%)`);

    root.style.setProperty('--app-promo-card-bg', c.promoCardBg);
    root.style.setProperty('--app-promo-title', c.promoTitleColor);

    root.style.setProperty('--app-page-bg', `linear-gradient(180deg, ${c.pageBgStart} 0%, ${c.pageBgEnd} 100%)`);
    root.style.setProperty('--app-hero-bg', `linear-gradient(89.79deg, ${c.heroBgStart} 0.92%, ${c.heroBgEnd} 99.82%)`);

    root.style.setProperty('--app-landing-bg', `linear-gradient(90deg, ${c.landingBgStart} 0%, ${c.landingBgEnd} 100%)`);
    root.style.setProperty('--app-login-bg', `linear-gradient(180deg, ${c.loginBgStart} 0%, ${c.loginBgEnd} 100%)`);
    root.style.setProperty('--app-login-button', c.loginButtonColor);
  }

  resetToDefaults(): void {
    const root = document.documentElement;
    root.style.removeProperty('--app-primary');
    root.style.removeProperty('--app-primary-subtle');
    root.style.removeProperty('--app-button');
    root.style.removeProperty('--app-button-hover');
    root.style.removeProperty('--app-nav-active-start');
    root.style.removeProperty('--app-nav-active-end');
    root.style.removeProperty('--app-nav-active-bg');
    root.style.removeProperty('--app-sidebar-top');
    root.style.removeProperty('--app-sidebar-bottom');
    root.style.removeProperty('--app-sidebar-bg');
    root.style.removeProperty('--app-promo-card-bg');
    root.style.removeProperty('--app-promo-title');
    root.style.removeProperty('--app-page-bg');
    root.style.removeProperty('--app-hero-bg');
    root.style.removeProperty('--app-landing-bg');
    root.style.removeProperty('--app-login-bg');
    root.style.removeProperty('--app-login-button');
  }

  applyForUrl(url: string): void {
    const module = getModuleFromUrl(url);

    // Never apply tenant colors to superadmin pages
    if (module === 'superadmin') {
      this.resetToDefaults();
      return;
    }

    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return;
      const colors = JSON.parse(cached) as BrandColors;

      if (module === 'landing') {
        this.applyColors(colors);
        return;
      }

      const applyTo: ApplyToModules = { ...APPLY_TO_DEFAULTS, ...(colors.applyTo || {}) };
      if (applyTo[module]) {
        this.applyColors(colors);
      } else {
        this.resetToDefaults();
      }
    } catch {}
  }

  loadAndApply(): void {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) this.applyColors(JSON.parse(cached) as BrandColors);
    } catch {}

    // Only fetch from API when an admin session exists.
    // Without a token the Admin middleware returns { status: 'expired' },
    // which the interceptor treats as a session expiry and redirects to /login —
    // breaking pages like /employee-portal/login that have no admin token.
    const adminToken = localStorage.getItem('token');
    if (!adminToken) return;

    this.http.post<{ status: boolean; data: BrandColors }>(`${this.baseUrl}get-brand-colors`, {}).subscribe({
      next: (res) => {
        if (res?.status && res.data && Object.keys(res.data).length > 0) {
          localStorage.setItem(CACHE_KEY, JSON.stringify(res.data));
          this.applyColors(res.data);
        }
      },
      error: () => {},
    });
  }

  getCached(): BrandColors | null {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      return cached ? (JSON.parse(cached) as BrandColors) : null;
    } catch {
      return null;
    }
  }

  saveToCache(colors: BrandColors): void {
    localStorage.setItem(CACHE_KEY, JSON.stringify(colors));
  }

  clearCache(): void {
    localStorage.removeItem(CACHE_KEY);
  }

  // ── SuperAdmin colors (localStorage-only) ────────────

  applySuperadminColors(colors: SAColors): void {
    const c = { ...SA_DEFAULTS, ...colors };
    const root = document.documentElement;
    root.style.setProperty('--sa-sidebar-bg', c.sidebarBg);
    root.style.setProperty('--sa-shell-bg', c.shellBg);
    const ac = hexToRgb(c.accentColor);
    if (ac) {
      root.style.setProperty('--sa-nav-active-bg', `rgba(${ac.r}, ${ac.g}, ${ac.b}, 0.18)`);
      root.style.setProperty('--sa-nav-active-border', `rgba(${ac.r}, ${ac.g}, ${ac.b}, 0.35)`);
      root.style.setProperty('--sa-accent', c.accentColor);
    }
  }

  resetSuperadminColors(): void {
    const root = document.documentElement;
    root.style.removeProperty('--sa-sidebar-bg');
    root.style.removeProperty('--sa-shell-bg');
    root.style.removeProperty('--sa-nav-active-bg');
    root.style.removeProperty('--sa-nav-active-border');
    root.style.removeProperty('--sa-accent');
  }

  loadAndApplySuperadmin(): void {
    try {
      const cached = localStorage.getItem(SA_CACHE_KEY);
      if (cached) this.applySuperadminColors(JSON.parse(cached) as SAColors);
    } catch {}
  }

  getSACached(): SAColors | null {
    try {
      const cached = localStorage.getItem(SA_CACHE_KEY);
      return cached ? (JSON.parse(cached) as SAColors) : null;
    } catch {
      return null;
    }
  }

  saveSAToCache(colors: SAColors): void {
    localStorage.setItem(SA_CACHE_KEY, JSON.stringify(colors));
  }
}
