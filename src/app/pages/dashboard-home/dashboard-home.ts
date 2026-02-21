import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { filter, take } from 'rxjs/operators';
import { RoleService } from '../../core/services/role.service';
import { DataService } from '../../core/services/data.service';

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule],
  templateUrl: './dashboard-home.html',
  styleUrls: ['./dashboard-home.scss'],
})
export class DashboardHome implements OnInit {
  private roleSvc = inject(RoleService);
  private dataSvc = inject(DataService);
  private cdr    = inject(ChangeDetectorRef);

  loading = true;
  error   = '';

  teachers:      any[] = [];
  totalTeachers  = 0;
  totalStudents  = 0;
  totalMinutes   = 0;

  ngOnInit(): void {
    this.loading = true;
    this.error   = '';

    this.roleSvc.claims$
      .pipe(
        filter((c): c is any => !!c),
        take(1)
      )
      .subscribe(async (claims) => {
        try {
          if (claims.role !== 'principal') {
            this.error = 'You are not allowed to view this page.';
            return;
          }

          const schoolId = claims.schoolId;
          if (!schoolId) {
            this.error = 'schoolId is missing in claims.';
            return;
          }

          const [teachers, totalTeachers, totalStudents, totalMinutes] =
            await Promise.all([
              this.dataSvc.getTeachers(schoolId),
              this.dataSvc.countTeachers(schoolId),
              this.dataSvc.countStudents(schoolId),
              this.dataSvc.totalMinutes(schoolId),
            ]);

          this.teachers      = teachers      ?? [];
          this.totalTeachers = totalTeachers ?? 0;
          this.totalStudents = totalStudents ?? 0;
          this.totalMinutes  = totalMinutes  ?? 0;
        } catch (e: any) {
          console.error('[DashboardHome] failed loading stats:', e);
          this.error = e?.message ?? String(e);
        } finally {
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
  }
}