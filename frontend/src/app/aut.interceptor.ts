import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);

  const superAdminToken = localStorage.getItem('superadminToken');
  const empPortalToken  = localStorage.getItem('empPortalToken');
  const panelToken      = localStorage.getItem('panelToken');
  const adminToken      = localStorage.getItem('token');
  const panelApiPaths = [
    'panel-user-logout',
    'get-my-interviews',
    'panel-save-feedback',
    'panel-feedback-detail'
  ];

  // Detect context: URL-based check AND token presence as fallback
  const isSuperAdmin = !!(
    superAdminToken &&
    (req.url.includes('/superadmin/') || req.url.includes('superadmin/'))
  ) && !req.url.includes('/superadmin/login');

  const isPanelUser = !!panelToken && panelApiPaths.some((path) => req.url.includes(path));
  const isEmpPortal = !!empPortalToken && !isSuperAdmin;

  let token: string | null;
  let branchId: string | null;

  if (isSuperAdmin) {
    token    = superAdminToken;
    branchId = null;
  } else if (isPanelUser) {
    token    = panelToken;
    branchId = null;
  } else if (isEmpPortal) {
    token    = empPortalToken;
    branchId = localStorage.getItem('empPortalBranchId');
  } else {
    token    = adminToken;
    branchId = localStorage.getItem('branchId');
  }

  const clonedRequest = token
    ? req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
          ...(branchId != null ? { branchId } : {})
        }
      })
    : req;

  return next(clonedRequest).pipe(
    tap((event) => {
      if (event instanceof HttpResponse) {
        let body = event.body as any;

        // responseType: 'text' responses arrive as a raw JSON string — parse it
        if (typeof body === 'string') {
          try { body = JSON.parse(body); } catch { /* not JSON, ignore */ }
        }

        if (body && body.status === 'expired') {
          // Save current page before clearing storage so login can redirect back
          if (!superAdminToken && !req.url.includes('superadmin/') && !isEmpPortal && !isPanelUser) {
            sessionStorage.setItem('returnUrl', router.url);
          }
          localStorage.clear();
          // Superadmin: check by token presence OR by URL
          if (superAdminToken || req.url.includes('superadmin/')) {
            router.navigate(['/superadmin/login']);
          } else if (isEmpPortal) {
            router.navigate(['/employee-portal/login']);
          } else if (isPanelUser) {
            router.navigate(['/login']);
          } else {
            router.navigate(['/login']);
          }
        }
      }
    })
  );
};
