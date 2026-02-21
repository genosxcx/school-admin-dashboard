import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { Router } from '@angular/router';
import { map } from 'rxjs/operators';

import { AuthService } from '../../core/services/auth.service';
import { RoleService } from '../../core/services/role.service';

import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [AsyncPipe, MatToolbarModule, MatButtonModule, MatIconModule],
  templateUrl: './topbar.html',
  styleUrls: ['./topbar.scss'],
})
export class Topbar {
  private roleSvc = inject(RoleService);

  isTeacher$ = this.roleSvc.claims$.pipe(
    map((claims) => (claims?.role ?? '').toString().toLowerCase() === 'teacher')
  );

  displayName = '...';

  constructor(private auth: AuthService, private router: Router) {
    this.auth.user$.subscribe((u) => {
      this.displayName = u?.email ?? 'User';
    });
  }

  async logout() {
    await this.auth.logout();
    await this.router.navigateByUrl('/login');
  }
}