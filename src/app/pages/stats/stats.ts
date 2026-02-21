import {
  Component,
  inject,
  OnDestroy,
  OnInit,
  NgZone,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, of } from 'rxjs';
import { catchError, filter, take, takeUntil, timeout } from 'rxjs/operators';

import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import {
  DataService,
  SchoolClass,
  Student,
} from '../../core/services/data.service';
import { RoleService } from '../../core/services/role.service';

type Summary = {
  teachers: number;
  students: number;
  classes: number;
  minutes: number;
};

type ClassStats = {
  classId: string;
  className: string;
  studentCount: number;
  totalMinutes: number;
  avgGrade: number; // 0..100
  avgCompletion: number; // 0..100
};

@Component({
  selector: 'app-stats',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressBarModule,
  ],
  templateUrl: './stats.html',
  styleUrls: ['./stats.scss'],
})
export class Stats implements OnInit, OnDestroy {
  private data = inject(DataService);
  private role = inject(RoleService);
  private zone = inject(NgZone);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();

  loading = true;
  error = '';
  schoolId = '';

  summary: Summary = { teachers: 0, students: 0, classes: 0, minutes: 0 };

  classes: SchoolClass[] = [];
  selectedClassId = '';
  selectedClassStats: ClassStats | null = null;
  classStudents: Student[] = [];

  ngOnInit(): void {
    this.zone.run(() => {
      this.loading = true;
      this.error = '';
    });
    this.cdr.detectChanges();

    this.role.claims$
      .pipe(
        timeout(8000),
        catchError((err) => {
          console.error('[Stats] claims$ failed:', err);
          this.zone.run(() => {
            this.error = 'Could not load your school info (claims).';
            this.loading = false;
          });
          this.cdr.detectChanges();
          return of(null);
        }),
        filter((c): c is any => !!c),
        take(1),
        takeUntil(this.destroy$)
      )
      .subscribe((claims) => {
        this.schoolId = claims.schoolId;
        this.loadOverview();
      });
  }

  private async loadOverview() {
    try {
      this.zone.run(() => (this.loading = true));
      this.cdr.detectChanges();

      const [
        teachers,
        students,
        classes,
        minutes,
        classList,
      ] = await Promise.all([
        this.data.countTeachers(this.schoolId),
        this.data.countStudents(this.schoolId),
        this.data.countClasses(this.schoolId),
        this.data.totalMinutesRecorded(this.schoolId),
        this.data.getClasses(this.schoolId),
      ]);

      this.zone.run(() => {
        this.summary = {
          teachers: teachers ?? 0,
          students: students ?? 0,
          classes: classes ?? 0,
          minutes: Number(minutes ?? 0),
        };

        // ✅ Explicitly type a/b to avoid TS7006
        this.classes = (classList ?? [])
          .slice()
          .sort((a: SchoolClass, b: SchoolClass) =>
            (a.name ?? '').localeCompare(b.name ?? '')
          );

        this.loading = false;

        if (!this.selectedClassId && this.classes.length) {
          this.selectClass(this.classes[0].id!);
        }
      });

      this.cdr.detectChanges();
    } catch (e) {
      console.error('[Stats] loadOverview failed:', e);
      this.zone.run(() => {
        this.error = 'Failed to load stats.';
        this.loading = false;
      });
      this.cdr.detectChanges();
    }
  }

  async selectClass(classId: string) {
    this.selectedClassId = classId;

    const cls = this.classes.find((c) => c.id === classId);
    const className = cls?.name ?? 'Class';

    this.zone.run(() => {
      this.selectedClassStats = null;
      this.classStudents = [];
      this.error = '';
    });
    this.cdr.detectChanges();

    try {
      const students = await this.data.getStudentsByClass(this.schoolId, classId);

      // ✅ Explicitly type s to avoid TS7006
      const safeStudents: Student[] = (students ?? []).map((s: Student) => ({
        ...s,
        grade: Number(s.grade ?? 0),
        completion: Number(s.completion ?? 0),
        minutesRecorded: Number(s.minutesRecorded ?? 0),
      }));

      const studentCount = safeStudents.length;

      // ✅ Explicitly type sum/s to avoid TS7006
      const totalMinutes = safeStudents.reduce(
        (sum: number, s: Student) => sum + Number(s.minutesRecorded ?? 0),
        0
      );

      const completionValues: number[] = safeStudents.map((s: Student) => {
        const v = Number(s.completion ?? 0);
        return v <= 1 ? v * 100 : v;
      });

      const avgCompletion = studentCount
        ? completionValues.reduce((a: number, b: number) => a + b, 0) / studentCount
        : 0;

      const avgGrade = studentCount
        ? safeStudents.reduce((a: number, b: Student) => a + Number(b.grade ?? 0), 0) /
          studentCount
        : 0;

      this.zone.run(() => {
        this.classStudents = safeStudents;
        this.selectedClassStats = {
          classId,
          className,
          studentCount,
          totalMinutes,
          avgGrade,
          avgCompletion,
        };
      });

      this.cdr.detectChanges();
    } catch (e) {
      console.error('[Stats] selectClass failed:', e);
      this.zone.run(() => {
        this.error = 'Failed to load class stats.';
      });
      this.cdr.detectChanges();
    }
  }

  completionPct(s: Student): number {
    const v = Number(s.completion ?? 0);
    const pct = v <= 1 ? v * 100 : v;
    return Math.max(0, Math.min(100, pct));
  }

  gradePct(s: Student): number {
    const v = Number(s.grade ?? 0);
    return Math.max(0, Math.min(100, v));
  }

  minutesText(n: number): string {
    return (Math.round(n * 10) / 10).toString();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}