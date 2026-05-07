import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  try {
    const user = await authService.waitForAuth();

    if (user) {
      return true;
    } else {
      // ✅ FIXED: Pointing to the correct login route path
      router.navigateByUrl('/admin/login');
      return false;
    }
  } catch (e) {
    router.navigateByUrl('/admin/login');
    return false;
  }
};