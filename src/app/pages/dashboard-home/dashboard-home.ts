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
  private cdr = inject(ChangeDetectorRef);

  loading = true;
  error = '';

  totalTeachers = 0;
  totalStudents = 0;
  totalMinutes = 0;

  ngOnInit(): void {
    this.loading = true;
    this.error = '';

    this.roleSvc.claims$
      .pipe(
        filter((c): c is any => !!c),
        take(1)
      )
      .subscribe((claims) => {
        this.loadDashboardData(claims);
      });
  }

  private async loadDashboardData(claims: any) {
    try {
      // Normalize role to lowercase
      const roleStr = (claims.role ?? '').toString().toLowerCase();

      // Check authorization
      if (roleStr !== 'principal' && roleStr !== 'admin') {
        this.error = 'You are not allowed to view this page.';
        this.loading = false;
        this.cdr.detectChanges();
        return;
      }

      const schoolId = claims.schoolId;
      if (!schoolId) {
        this.error = 'School ID is missing from your account.';
        this.loading = false;
        this.cdr.detectChanges();
        return;
      }

      // Load all dashboard metrics in parallel
      const [totalTeachers, totalStudents, totalMinutes] = await Promise.all([
        this.dataSvc.countTeachers(schoolId),
        this.dataSvc.countStudents(schoolId),
        this.dataSvc.totalMinutesRecorded(schoolId),
      ]);

      this.totalTeachers = totalTeachers ?? 0;
      this.totalStudents = totalStudents ?? 0;
      this.totalMinutes = totalMinutes ?? 0;

      this.loading = false;
    } catch (error: any) {
      console.error('[DashboardHome] Error loading dashboard:', error);
      this.error = error?.message ?? 'Failed to load dashboard data.';
      this.loading = false;
    } finally {
      this.cdr.detectChanges();
    }
  }
}