import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';

/** Default brand logo shown when a company has not uploaded its own. */
export const DEFAULT_COMPANY_LOGO = 'assets/img/logo/image.png';

/** 'admin' = HR/admin panel session, 'portal' = employee portal session. */
export type CompanyLogoScope = 'admin' | 'portal';

/** 'light' = for white/light surfaces (letters, PDFs), 'dark' = for dark surfaces (sidebar). */
export type CompanyLogoVariant = 'light' | 'dark';

/** Uploaded logo URLs (Tenant.image / Tenant.imageDark); null when not set. */
export interface CompanyLogos {
  light: string | null;
  dark: string | null;
}

const STORAGE_KEYS: Record<CompanyLogoScope, Record<CompanyLogoVariant, string>> = {
  admin: { light: 'companyLogo', dark: 'companyLogoDark' },
  portal: { light: 'empPortalCompanyLogo', dark: 'empPortalCompanyLogoDark' },
};

const ENDPOINTS: Record<CompanyLogoScope, string> = {
  admin: 'get-company-logo',
  portal: 'get-app-company-logo',
};

/** Wanted variant first, then the other one (a single uploaded logo is used everywhere). */
function pick(logos: CompanyLogos, variant: CompanyLogoVariant): string | null {
  return variant === 'dark' ? logos.dark || logos.light : logos.light || logos.dark;
}

/**
 * Holds the logged-in company's logos. Login stores them; layouts subscribe
 * and fall back to DEFAULT_COMPANY_LOGO when the company has none.
 */
@Injectable({ providedIn: 'root' })
export class CompanyLogoService {
  private readonly base = environment.apiUrl;
  private readonly logos: Record<CompanyLogoScope, BehaviorSubject<CompanyLogos>> = {
    admin: new BehaviorSubject<CompanyLogos>(this.read('admin')),
    portal: new BehaviorSubject<CompanyLogos>(this.read('portal')),
  };

  constructor(private http: HttpClient) {}

  /** Logo URL for a surface, or the default logo when the company has none. */
  logo$(scope: CompanyLogoScope = 'admin', variant: CompanyLogoVariant = 'light'): Observable<string> {
    return this.logos[scope].pipe(map((logos) => pick(logos, variant) || DEFAULT_COMPANY_LOGO));
  }

  /** Logo URL for a surface, or null when the company has none. */
  current(scope: CompanyLogoScope = 'admin', variant: CompanyLogoVariant = 'light'): string | null {
    return pick(this.logos[scope].value, variant);
  }

  /** Replaces both stored logos (missing ones are cleared). */
  setLogos(logos: Partial<CompanyLogos>, scope: CompanyLogoScope = 'admin'): void {
    const value: CompanyLogos = {
      light: logos.light ? String(logos.light) : null,
      dark: logos.dark ? String(logos.dark) : null,
    };
    try {
      (['light', 'dark'] as CompanyLogoVariant[]).forEach((variant) => {
        const key = STORAGE_KEYS[scope][variant];
        if (value[variant]) localStorage.setItem(key, value[variant] as string);
        else localStorage.removeItem(key);
      });
    } catch { /* storage unavailable */ }
    this.logos[scope].next(value);
  }

  /** Re-reads the logos from the server (e.g. sessions that logged in before logos existed). */
  refresh(scope: CompanyLogoScope = 'admin'): void {
    this.http.post<any>(`${this.base}${ENDPOINTS[scope]}`, {}).subscribe({
      next: (res) => {
        if (res?.status === true) {
          this.setLogos({ light: res?.data?.url || null, dark: res?.data?.darkUrl || null }, scope);
        }
      },
      error: () => { /* keep the cached logos */ },
    });
  }

  /** Swap a broken logo image for the default one. */
  onImgError(event: Event, fallback: string = DEFAULT_COMPANY_LOGO): void {
    const img = event.target as HTMLImageElement | null;
    if (img && !img.src.endsWith(fallback)) img.src = fallback;
  }

  private read(scope: CompanyLogoScope): CompanyLogos {
    try {
      return {
        light: localStorage.getItem(STORAGE_KEYS[scope].light) || null,
        dark: localStorage.getItem(STORAGE_KEYS[scope].dark) || null,
      };
    } catch {
      return { light: null, dark: null };
    }
  }
}
