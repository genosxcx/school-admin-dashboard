import { Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { Shell } from './layout/shell/shell';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { superAdminGuard } from './core/guards/superadmin.guard';
import { DashboardHome } from './pages/dashboard-home/dashboard-home';
import { Teachers } from './pages/teachers/teachers';
import { Students } from './pages/students/students';
import { Classes } from './pages/classes/classes';
import { Stats } from './pages/stats/stats';
import { Library } from './pages/library/library';
import { Settings } from './pages/settings/settings';
import { PrincipalRegister } from './pages/principal-register/principal-register';
import { SuperadminLogin } from './pages/superadmin-login/superadmin-login';
import { SuperadminRequests } from './pages/superadmin-requests/superadmin-requests';
export const routes: Routes = [
  // ✅ SUPERADMIN as separate area (top-level)
  { path: 'superadmin', component: SuperadminLogin },
{ path: 'superadmin/requests', component: SuperadminRequests, canActivate: [superAdminGuard] },

  // ✅ ADMIN area
  {
    path: 'admin',
    children: [
      { path: 'login', component: Login },
      { path: 'register', component: PrincipalRegister },

      {
        path: '',
        component: Shell,
        canActivate: [authGuard],
        children: [
          { path: '', component: DashboardHome },

          // principal-only
          {
            path: 'teachers',
            component: Teachers,
            canActivate: [roleGuard],
            data: { roles: ['PRINCIPAL', 'ADMIN'] },
          },
          {
            path: 'classes',
            component: Classes,
            canActivate: [roleGuard],
            data: { roles: ['PRINCIPAL', 'ADMIN'] },
          },

          // shared
          { path: 'students', component: Students },
          { path: 'library', component: Library },
          { path: 'stats', component: Stats },
          { path: 'settings', component: Settings },
        ],
      },
    ],
  },

  // ✅ everything else goes to admin login
  { path: '**', redirectTo: 'admin/login' },
];