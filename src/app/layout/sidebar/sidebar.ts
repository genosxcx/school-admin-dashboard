import { Component, inject } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { map } from 'rxjs/operators';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { RoleService } from '../../core/services/role.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    AsyncPipe,
    MatListModule,
    MatIconModule,
  ],
  templateUrl: './sidebar.html',
  styleUrls: ['./sidebar.scss'],
})
export class Sidebar {
  private roleSvc = inject(RoleService);

  isTeacher$ = this.roleSvc.claims$.pipe(
    map((claims) => (claims?.role ?? '').toString().toLowerCase() === 'teacher')
  );

  isSubjectTeacher$ = this.roleSvc.claims$.pipe(
    map((claims) => (claims?.role ?? '').toString().toLowerCase() === 'subject_teacher')
  );

  isPrincipal$ = this.roleSvc.claims$.pipe(
    map((claims) => ['principal', 'admin'].includes((claims?.role ?? '').toString().toLowerCase()))
  );

  // ✅ Added Parent Check
  isParent$ = this.roleSvc.claims$.pipe(
    map((claims) => (claims?.role ?? '').toString().toLowerCase() === 'parent')
  );
}