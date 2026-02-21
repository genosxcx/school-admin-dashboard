import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  console.log('[authGuard] Checking auth for route:', state.url);

  try {
    // Wait for Firebase to initialize and check for stored session
    const user = await authService.waitForAuth();

    if (user) {
      console.log('[authGuard] User is authenticated:', user.uid);
      return true;
    } else {
      console.log('[authGuard] No user logged in');
      router.navigateByUrl('/login');
      return false;
    }
  } catch (e) {
    console.error('[authGuard] Auth guard error:', e);
    router.navigateByUrl('/login');
    return false;
  }
};