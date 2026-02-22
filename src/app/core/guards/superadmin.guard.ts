import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const superAdminGuard: CanActivateFn = async () => {
  const authSvc = inject(AuthService);
  const router = inject(Router);

  // wait for Firebase to restore session
  const user = await authSvc.waitForAuth();

  const SUPERADMIN_EMAIL = 'ayansar85@gmail.com';

  if (!user?.email) {
    await router.navigateByUrl('/superadmin');
    return false;
  }

  if (user.email.toLowerCase() !== SUPERADMIN_EMAIL.toLowerCase()) {
    await router.navigateByUrl('/superadmin');
    return false;
  }

  return true;
};