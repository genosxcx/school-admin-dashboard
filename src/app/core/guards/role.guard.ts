import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { RoleService } from '../services/role.service';
import { AuthService } from '../services/auth.service'; // ✅ Import AuthService

export const roleGuard: CanActivateFn = async (route) => {
  const roleSvc = inject(RoleService);
  const authSvc = inject(AuthService); // ✅ Inject AuthService
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  // 1. Bypass check if running on the server (SSR) to prevent false logouts
  if (!isPlatformBrowser(platformId)) {
    return true; 
  }

  try {
    // 🚀 THE FIX: Force the roleGuard to wait for Firebase to fully restore the session 
    // BEFORE it attempts to read the user's claims.
    await authSvc.waitForAuth();

    const claims = await roleSvc.getClaims();

    // If no schoolId, treat as not allowed and send to login
    if (!claims?.schoolId) return router.parseUrl('/admin/login');

    // Look for the 'roles' array defined in your routes.ts
    const allowedRoles = route.data?.['roles'] as string[] | undefined;
    
    if (allowedRoles && claims.role) {
      // Check if the user's role is inside the allowedRoles array (case-insensitive)
      const hasRole = allowedRoles.map(r => r.toUpperCase()).includes(claims.role.toUpperCase());
      
      if (!hasRole) {
        // If they don't have the right role, send them to the main dashboard instead of login
        return router.parseUrl('/admin'); 
      }
    }

    return true;
  } catch (e) {
    return router.parseUrl('/admin/login');
  }
};