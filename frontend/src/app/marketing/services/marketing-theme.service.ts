import { Injectable, signal, effect } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

/**
 * Light/dark theme for the whole app (marketing + login + admin shell).
 * - Marketing uses Tailwind `.dark`
 * - Admin / Bootstrap uses `data-bs-theme` + `light-style` / `dark-style`
 * Preference is stored in localStorage (`gens-theme`) so landing dark
 * continues inside the product.
 */
@Injectable({ providedIn: 'root' })
export class MarketingThemeService {
  private readonly STORAGE_KEY = 'gens-theme';
  private readonly NG_SELECT_STYLE_ID = 'gens-ng-select-theme-override';
  private headObserver: MutationObserver | null = null;

  readonly theme = signal<ThemeMode>(this.getInitialTheme());
  readonly isDark = signal(this.theme() === 'dark');

  constructor() {
    effect(() => {
      const mode = this.theme();
      this.applyToDocument(mode);
      localStorage.setItem(this.STORAGE_KEY, mode);
      this.isDark.set(mode === 'dark');
    });
    this.watchHeadForStyleOrder();
  }

  toggle(): void {
    this.theme.update((t) => (t === 'light' ? 'dark' : 'light'));
  }

  setTheme(mode: ThemeMode): void {
    this.theme.set(mode);
  }

  /** Re-apply stored theme (e.g. after navigation / hard refresh). */
  syncFromStorage(): void {
    const mode = this.getInitialTheme();
    if (this.theme() !== mode) {
      this.theme.set(mode);
    } else {
      this.applyToDocument(mode);
    }
  }

  private applyToDocument(mode: ThemeMode): void {
    const root = document.documentElement;
    const shell = document.querySelector('.gens-marketing');
    const isDark = mode === 'dark';

    root.classList.toggle('dark', isDark);
    shell?.classList.toggle('dark', isDark);

    // Materialize / Bootstrap admin shell
    root.classList.toggle('dark-style', isDark);
    root.classList.toggle('light-style', !isDark);
    root.setAttribute('data-bs-theme', mode);
    root.setAttribute('data-style', mode);

    // Last-in-head override so ng-select selected labels stay visible on every page
    this.syncNgSelectOverride(isDark);

    // Override brand page bg so admin shell / cards follow dark without fighting ThemeService
    if (isDark) {
      root.style.setProperty(
        '--app-page-bg',
        'radial-gradient(ellipse 50% 40% at 90% 0%, rgba(0, 180, 166, 0.12) 0%, transparent 55%), linear-gradient(180deg, #0b1220 0%, #111827 45%, #0f172a 100%)',
      );
      root.style.setProperty('--bs-body-bg', '#0f172a');
      root.style.setProperty('--bs-body-bg-rgb', '15, 23, 42');
      root.style.setProperty('--bs-body-color', '#e2e8f0');
      root.style.setProperty('--bs-paper-bg', '#1e293b');
      root.style.setProperty('--bs-paper-bg-rgb', '30, 41, 59');
      root.style.setProperty('--bs-heading-color', '#f1f5f9');
      root.style.setProperty('--bs-secondary-color', '#94a3b8');
      root.style.setProperty('--bs-border-color', 'rgba(148, 163, 184, 0.18)');
      root.style.setProperty('--bs-card-bg', '#1e293b');
    } else {
      // Let ThemeService brand vars win again on light
      root.style.removeProperty('--bs-body-bg');
      root.style.removeProperty('--bs-body-bg-rgb');
      root.style.removeProperty('--bs-body-color');
      root.style.removeProperty('--bs-paper-bg');
      root.style.removeProperty('--bs-paper-bg-rgb');
      root.style.removeProperty('--bs-heading-color');
      root.style.removeProperty('--bs-secondary-color');
      root.style.removeProperty('--bs-border-color');
      root.style.removeProperty('--bs-card-bg');
      // Re-apply tenant page / login / landing bg if cached
      try {
        const cached = localStorage.getItem('app_brand_colors');
        if (cached) {
          const colors = JSON.parse(cached) as {
            pageBgStart?: string;
            pageBgEnd?: string;
            landingBgStart?: string;
            landingBgEnd?: string;
            loginBgStart?: string;
            loginBgEnd?: string;
          };
          const pageStart = colors.pageBgStart || '#eaf1f6';
          const pageEnd = colors.pageBgEnd || '#dfe9f0';
          const landStart = colors.landingBgStart || '#d6e4f0';
          const landEnd = colors.landingBgEnd || '#fff1eb';
          const loginStart = colors.loginBgStart || '#fff5f5';
          const loginEnd = colors.loginBgEnd || '#eaf1f6';
          root.style.setProperty('--app-page-bg', `linear-gradient(180deg, ${pageStart} 0%, ${pageEnd} 100%)`);
          root.style.setProperty('--app-landing-bg', `linear-gradient(90deg, ${landStart} 0%, ${landEnd} 100%)`);
          root.style.setProperty('--app-login-bg', `linear-gradient(180deg, ${loginStart} 0%, ${loginEnd} 100%)`);
        } else {
          root.style.removeProperty('--app-page-bg');
          root.style.removeProperty('--app-landing-bg');
          root.style.removeProperty('--app-login-bg');
        }
      } catch {
        root.style.removeProperty('--app-page-bg');
        root.style.removeProperty('--app-landing-bg');
        root.style.removeProperty('--app-login-bg');
      }
    }
  }

  private getInitialTheme(): ThemeMode {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY) as ThemeMode | null;
      // Only follow explicit user choice from marketing landing toggle
      if (stored === 'light' || stored === 'dark') return stored;
    } catch {
      /* ignore */
    }
    // Default stays light — don't auto-switch from OS preference
    return 'light';
  }

  /**
   * Injected <style> appended to document.head (always last) so it beats
   * default.theme.css #333 and any component ::ng-deep light-text rules.
   * Cleared when switching back to light.
   */
  private syncNgSelectOverride(isDark: boolean): void {
    let el = document.getElementById(this.NG_SELECT_STYLE_ID) as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement('style');
      el.id = this.NG_SELECT_STYLE_ID;
      document.head.appendChild(el);
    } else {
      document.head.appendChild(el);
    }

    if (!isDark) {
      el.textContent = '';
      return;
    }

    // Match form-select ("Show 10 entries"): dark field + light text
    el.textContent = `
html.dark .ng-select .ng-select-container,
html.dark-style .ng-select .ng-select-container,
[data-bs-theme='dark'] .ng-select .ng-select-container,
.ng-select .ng-select-container,
.ng-select.ng-select-single .ng-select-container,
.ng-select.ng-select-opened > .ng-select-container {
  background: #0f172a !important;
  background-color: #0f172a !important;
  border-color: #475569 !important;
  color: #e2e8f0 !important;
}
html.dark .ng-select .ng-value,
html.dark .ng-select .ng-value-label,
html.dark .ng-select .ng-value-container .ng-value .ng-value-label,
.ng-select .ng-value,
.ng-select .ng-value-label,
.ng-select .ng-value-container .ng-value .ng-value-label,
.ng-select .ng-input > input {
  color: #f1f5f9 !important;
  -webkit-text-fill-color: #f1f5f9 !important;
  opacity: 1 !important;
  visibility: visible !important;
  background: transparent !important;
}
.ng-select .ng-placeholder,
.ng-select .ng-value-container .ng-placeholder {
  color: #94a3b8 !important;
  -webkit-text-fill-color: #94a3b8 !important;
  background: transparent !important;
}
.ng-select .ng-value-container,
.ng-select .ng-value,
.ng-select .ng-input,
.ng-select .ng-input > input,
.ng-select input {
  background: transparent !important;
  background-color: transparent !important;
  border: 0 !important;
  box-shadow: none !important;
}
.ng-select .ng-clear-wrapper,
.ng-select .ng-arrow-wrapper,
.ng-select .ng-arrow-wrapper .ng-arrow {
  color: #94a3b8 !important;
  border-color: #94a3b8 transparent transparent !important;
}
.ng-dropdown-panel {
  background: #1e293b !important;
  border-color: rgba(148, 163, 184, 0.2) !important;
  color: #e2e8f0 !important;
}
.ng-dropdown-panel .ng-option {
  background: #1e293b !important;
  color: #e2e8f0 !important;
}
.ng-dropdown-panel .ng-option.ng-option-marked,
.ng-dropdown-panel .ng-option.ng-option-selected {
  background: rgba(0, 180, 166, 0.15) !important;
  color: #5eead4 !important;
}
`;
  }

  /** Angular injects component styles after navigation — keep our override last. */
  private watchHeadForStyleOrder(): void {
    if (typeof MutationObserver === 'undefined' || this.headObserver) return;
    this.headObserver = new MutationObserver(() => {
      const el = document.getElementById(this.NG_SELECT_STYLE_ID);
      if (el && el.parentElement?.lastElementChild !== el) {
        document.head.appendChild(el);
      }
    });
    this.headObserver.observe(document.head, { childList: true });
  }
}
