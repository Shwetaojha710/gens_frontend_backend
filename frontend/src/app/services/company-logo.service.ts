import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';

/** Default brand logo shown when a company has not uploaded its own. */
export const DEFAULT_COMPANY_LOGO = 'assets/img/logo/image.png';

/** 'admin' = HR/admin panel session, 'portal' = employee portal session. */
export type CompanyLogoScope = 'admin' | 'portal';

const STORAGE_KEYS: Record<CompanyLogoScope, string> = {
  admin: 'companyLogo',
  portal: 'empPortalCompanyLogo',
};

const ENDPOINTS: Record<CompanyLogoScope, string> = {
  admin: 'get-company-logo',
  portal: 'get-app-company-logo',
};

/**
 * Holds the logged-in company's logo URL (Tenant.image on the backend).
 * Login stores it; layouts subscribe and fall back to DEFAULT_COMPANY_LOGO.
 */
@Injectable({ providedIn: 'root' })
export class CompanyLogoService {
  private readonly base = environment.apiUrl;
  private readonly logos: Record<CompanyLogoScope, BehaviorSubject<string | null>> = {
    admin: new BehaviorSubject<string | null>(this.read('admin')),
    portal: new BehaviorSubject<string | null>(this.read('portal')),
  };

  constructor(private http: HttpClient) {}

  /** Company logo URL, or the default logo when none is set. */
  logo$(scope: CompanyLogoScope = 'admin'): Observable<string> {
    return this.logos[scope].pipe(map((url) => url || DEFAULT_COMPANY_LOGO));
  }

  /** Company logo URL, or null when the company has none. */
  current(scope: CompanyLogoScope = 'admin'): string | null {
    return this.logos[scope].value;
  }

  set(url: string | null | undefined, scope: CompanyLogoScope = 'admin'): void {
    const value = url ? String(url) : null;
    try {
      if (value) localStorage.setItem(STORAGE_KEYS[scope], value);
      else localStorage.removeItem(STORAGE_KEYS[scope]);
    } catch { /* storage unavailable */ }
    this.logos[scope].next(value);
  }

  /** Re-reads the logo from the server (e.g. sessions that logged in before logos existed). */
  refresh(scope: CompanyLogoScope = 'admin'): void {
    this.http.post<any>(`${this.base}${ENDPOINTS[scope]}`, {}).subscribe({
      next: (res) => {
        if (res?.status === true) this.set(res?.data?.url || null, scope);
      },
      error: () => { /* keep the cached logo */ },
    });
  }

  /** Swap a broken logo image for the default one. */
  onImgError(event: Event, fallback: string = DEFAULT_COMPANY_LOGO): void {
    const img = event.target as HTMLImageElement | null;
    if (img && !img.src.endsWith(fallback)) img.src = fallback;
  }

  private read(scope: CompanyLogoScope): string | null {
    try {
      return localStorage.getItem(STORAGE_KEYS[scope]) || null;
    } catch {
      return null;
    }
  }
}
