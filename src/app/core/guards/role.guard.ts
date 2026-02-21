import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { RoleService } from '../services/role.service';

export const roleGuard: CanActivateFn = async (route) => {
  const roleSvc = inject(RoleService);
  const router = inject(Router);

  try {
    const claims = await roleSvc.getClaims();

    // if no schoolId, treat as not allowed
    if (!claims?.schoolId) return router.parseUrl('/login');

    // optional: check required role from route data
    const required = route.data?.['role'] as string | undefined;
    if (required && claims.role !== required) {
      return router.parseUrl('/login');
    }

    return true;
  } catch (e) {
    return router.parseUrl('/login');
  }
};