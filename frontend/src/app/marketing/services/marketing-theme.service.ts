import { Injectable, signal, effect } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

/**
 * Light/dark theme for the marketing site only (toggles `.dark` on <html>).
 * Named `MarketingThemeService` — not `ThemeService` — to avoid colliding
 * with the existing, unrelated `frontend/src/app/services/theme.service.ts`
 * (tenant brand-color theming for the admin dashboard).
 */
@Injectable({ providedIn: 'root' })
export class MarketingThemeService {
  private readonly STORAGE_KEY = 'gens-theme';

  readonly theme = signal<ThemeMode>(this.getInitialTheme());
  readonly isDark = signal(this.theme() === 'dark');

  constructor() {
    effect(() => {
      const mode = this.theme();
      const root = document.documentElement;
      const shell = document.querySelector('.gens-marketing');
      if (mode === 'dark') {
        root.classList.add('dark');
        shell?.classList.add('dark');
      } else {
        root.classList.remove('dark');
        shell?.classList.remove('dark');
      }
      localStorage.setItem(this.STORAGE_KEY, mode);
      this.isDark.set(mode === 'dark');
    });
  }

  toggle(): void {
    this.theme.update((t) => (t === 'light' ? 'dark' : 'light'));
  }

  setTheme(mode: ThemeMode): void {
    this.theme.set(mode);
  }

  private getInitialTheme(): ThemeMode {
    const stored = localStorage.getItem(this.STORAGE_KEY) as ThemeMode | null;
    if (stored === 'light' || stored === 'dark') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
}
