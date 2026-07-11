import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { map } from 'rxjs/operators';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { RoleService } from '../../core/services/role.service';
import { DataService } from '../../core/services/data.service'; // ✅ Added

// ✅ Import TranslatePipe directly instead of the module
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    AsyncPipe,
    MatListModule,
    MatIconModule,
    TranslatePipe 
  ],
  templateUrl: './sidebar.html',
  styleUrls: ['./sidebar.scss'],
})
export class Sidebar implements OnInit {
  private roleSvc = inject(RoleService);
  private dataSvc = inject(DataService); // ✅ Added
  private cdr = inject(ChangeDetectorRef); // ✅ Added

  isTeacher$ = this.roleSvc.claims$.pipe(
    map((claims) => (claims?.role ?? '').toString().toLowerCase() === 'teacher')
  );

  isSubjectTeacher$ = this.roleSvc.claims$.pipe(
    map((claims) => (claims?.role ?? '').toString().toLowerCase() === 'subject_teacher')
  );

  isPrincipal$ = this.roleSvc.claims$.pipe(
    map((claims) => ['principal', 'admin'].includes((claims?.role ?? '').toString().toLowerCase()))
  );

  isParent$ = this.roleSvc.claims$.pipe(
    map((claims) => (claims?.role ?? '').toString().toLowerCase() === 'parent')
  );

  // ✅ New properties for school details
  schoolName = '';
  schoolLogo = '';

  ngOnInit() {
    // ✅ Fetch school details here
    this.roleSvc.claims$.subscribe(async (claims) => {
      const schoolId = claims?.schoolId;
      if (schoolId) {
        try {
          const schoolDoc = await this.dataSvc.getSchoolDetails(schoolId);
          this.schoolName = schoolDoc?.['name'] ?? '';
          this.schoolLogo = schoolDoc?.['logoUrl'] ?? '';
          this.cdr.detectChanges(); // Update the view once data arrives
        } catch (error) {
          console.error('[Sidebar] Failed to load school details:', error);
        }
      }
    });
  }
}