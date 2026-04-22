import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const employeePortalGuard: CanActivateFn = () => {
  const router = inject(Router);
  const token = localStorage.getItem('empPortalToken');
  if (!token) {
    router.navigate(['/employee-portal/login']);
    return false;
  }
  return true;
};
