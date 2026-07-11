import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
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
    MatFormFieldModule,
    TranslatePipe
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

  totalTeachers = 0;
  totalStudents = 0;
  totalMinutes = 0;

  ngOnInit(): void {
    this.roleSvc.claims$.pipe(filter((c): c is any => !!c), take(1)).subscribe((claims) => {
      const roleStr = (claims.role ?? '').toString().toLowerCase();
      this.isPrincipal = roleStr === 'principal' || roleStr === 'admin';
      this.schoolId = claims.schoolId ?? '';
      this.loadDashboardData();
    });
  }

  private async loadDashboardData() {
    try {
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
      console.error('[DashboardHome] Detailed error:', error);
      this.error = 'Failed to load dashboard data.';
      this.loading = false;
    } finally {
      this.cdr.detectChanges();
    }
  }
}