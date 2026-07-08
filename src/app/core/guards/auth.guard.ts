import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  // 🚀 THE FIX: If we are on the server (SSR), let the route pass.
  // The server doesn't have local storage. The browser will re-run this guard instantly.
  if (!isPlatformBrowser(platformId)) {
    return true; 
  }

  try {
    const user = await authService.waitForAuth();

    if (user) {
      return true;
    } else {
      router.navigateByUrl('/admin/login');
      return false;
    }
  } catch (e) {
    router.navigateByUrl('/admin/login');
    return false;
  }
};