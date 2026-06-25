import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router } from '@angular/router';
import { PermissionService } from './services/permission.service';
import { Notyf } from 'notyf';

/**
 * Route guard that checks PermissionService for a `permKey` declared in route data.
 *
 * Usage in routes:
 *   { path: '...', canActivate: [PermissionGuard], data: { permKey: 'dashboard' }, ... }
 *
 * Optional `redirectTo` in route data overrides the default fallback URL.
 *   data: { permKey: 'dashboard', redirectTo: '/landing-home' }
 */
@Injectable({ providedIn: 'root' })
export class PermissionGuard implements CanActivate {
  private notyf = new Notyf();

  constructor(
    private permSvc: PermissionService,
    private router: Router,
  ) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    const permKey    = route.data?.['permKey']    as string | undefined;
    const redirectTo = route.data?.['redirectTo'] as string | undefined;

    // No permKey declared → allow through
    if (!permKey) return true;

    // Read user role from localStorage
    let role = 'hr';
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      role = user?.role ?? 'hr';
    } catch { /* ignore */ }

    if (this.permSvc.can(permKey, role)) return true;

    // ── Access denied ────────────────────────────────────────────────────────
    this.notyf.error('You do not have permission to access this page.');

    // Use explicit redirectTo if provided, otherwise pick a smart default
    if (redirectTo) {
      this.router.navigate([redirectTo]);
    } else if (permKey === 'dashboard') {
      // Dashboard itself is blocked → go back to portal selection
      this.router.navigate(['/landing-home']);
    } else if (permKey === 'rec.dashboard') {
      this.router.navigate(['/landing-home']);
    } else if (permKey.startsWith('rec.') || permKey.startsWith('rec-')) {
      // Recruitment module page → fall back to recruitment dashboard
      this.router.navigate(['/recruitment/recruitment-dashboard']);
    } else {
      // Employee Management / any layout page → fall back to main dashboard
      this.router.navigate(['/layout/dashboard']);
    }

    return false;
  }
}
