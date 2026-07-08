import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { filter, take } from 'rxjs/operators';
import { RoleService } from '../../core/services/role.service';
import { DataService } from '../../core/services/data.service';

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    MatCardModule, 
    MatButtonModule, 
    MatIconModule,
    MatInputModule,
    MatFormFieldModule
  ],
  templateUrl: './dashboard-home.html',
  styleUrls: ['./dashboard-home.scss'],
})
export class DashboardHome implements OnInit {
  private roleSvc = inject(RoleService);
  private dataSvc = inject(DataService);
  private cdr = inject(ChangeDetectorRef);

  loading = true;
  error = '';
  isPrincipal = false;
  schoolId = '';

  schoolName = 'Hya Naqra\'a';
  schoolLogo = '';
  totalTeachers = 0;
  totalStudents = 0;
  totalMinutes = 0;

  ngOnInit(): void {
    this.roleSvc.claims$.pipe(filter((c): c is any => !!c), take(1)).subscribe((claims) => {
      const roleStr = (claims.role ?? '').toString().toLowerCase();
      this.isPrincipal = roleStr === 'principal' || roleStr === 'admin';
      this.schoolId = claims.schoolId;
      this.loadDashboardData();
    });
  }

  private async loadDashboardData() {
    try {
      // ... your existing auth/schoolId checks ...

      // 1. Get school details first
      const schoolDoc = await this.dataSvc.getSchoolDetails(this.schoolId);
      
      // 2. Set branding with safe defaults if doc is missing
      this.schoolName = schoolDoc?.['name'] ?? 'Hya Naqra\'a';
      this.schoolLogo = schoolDoc?.['logoUrl'] ?? '';

      // 3. Now run the counts
      const [homeT, subT, studs, mins] = await Promise.all([
        this.dataSvc.countTeachers(this.schoolId),
        this.dataSvc.countSubjectTeachers(this.schoolId), 
        this.dataSvc.countStudents(this.schoolId),
        this.dataSvc.totalMinutesRecorded(this.schoolId),
      ]);

      this.totalTeachers = (homeT ?? 0) + (subT ?? 0);
      this.totalStudents = studs ?? 0;
      this.totalMinutes = mins ?? 0;
      
      this.loading = false;
    } catch (error: any) {
      // 4. Log the ACTUAL error to your console
      console.error('[DashboardHome] Detailed error:', error);
      this.error = 'Failed to load dashboard data.';
      this.loading = false;
    } finally {
      this.cdr.detectChanges();
    }
  }

  async updateSchoolBranding() {
    if (!this.isPrincipal) return;
    try {
      await this.dataSvc.updateSchoolDetails(this.schoolId, { 
        name: this.schoolName, 
        logoUrl: this.schoolLogo 
      });
    } catch (e) {
      console.error('Failed to save branding', e);
    }
  }
}