import { Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { Shell } from './layout/shell/shell';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

import { DashboardHome } from './pages/dashboard-home/dashboard-home';
import { Teachers } from './pages/teachers/teachers';
import { Students } from './pages/students/students';
import { Classes } from './pages/classes/classes';
import { Stats } from './pages/stats/stats';
import { Library } from './pages/library/library';
import { Settings } from './pages/settings/settings';

export const routes: Routes = [
  {
    path: 'admin',
    children: [
      { path: 'login', component: Login },

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

  { path: '**', redirectTo: 'admin/login' },
];