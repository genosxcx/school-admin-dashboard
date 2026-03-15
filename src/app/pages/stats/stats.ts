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

import { DataService, SchoolClass, Student } from '../../core/services/data.service';
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
  avgGrade: number;
  avgCompletion: number;
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

  // ✅ Role checking
  isPrincipal = false;
  isTeacher = false;
  isSubjectTeacher = false;

  // ✅ Class filters
  teacherClassId = '';
  subjectTeacherClassIds: string[] = [];

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
        
        const roleStr = (claims.role ?? '').toString().toLowerCase();
        this.isPrincipal = roleStr === 'principal' || roleStr === 'admin';
        this.isTeacher = roleStr === 'teacher';
        this.isSubjectTeacher = roleStr === 'subject_teacher';

        this.teacherClassId = (claims.classId ?? '').toString();
        this.subjectTeacherClassIds = Array.isArray(claims.classIds) ? claims.classIds : [];

        if (this.isTeacher && !this.teacherClassId) {
          this.zone.run(() => {
            this.error = 'Your account is not assigned to a class yet.';
            this.loading = false;
          });
          this.cdr.detectChanges();
          return;
        }

        if (this.isSubjectTeacher && this.subjectTeacherClassIds.length === 0) {
          this.zone.run(() => {
            this.error = 'Your account is not assigned to any classes yet.';
            this.loading = false;
          });
          this.cdr.detectChanges();
          return;
        }

        this.loadOverview();
      });
  }

  private async loadOverview() {
    try {
      this.zone.run(() => (this.loading = true));
      this.cdr.detectChanges();

      const classList = await this.data.getClasses(this.schoolId);

      // ✅ Filter classes based on role
      let visibleClasses = classList ?? [];
      if (this.isTeacher) {
        visibleClasses = visibleClasses.filter((c) => c.id === this.teacherClassId);
      } else if (this.isSubjectTeacher) {
        visibleClasses = visibleClasses.filter((c) => c.id && this.subjectTeacherClassIds.includes(c.id));
      }

      // Summary Logic
      if (this.isPrincipal) {
        const [teachers, students, classes, minutes] = await Promise.all([
          this.data.countTeachers(this.schoolId),
          this.data.countStudents(this.schoolId),
          this.data.countClasses(this.schoolId),
          this.data.totalMinutesRecorded(this.schoolId),
        ]);

        this.zone.run(() => {
          this.summary = {
            teachers: teachers ?? 0,
            students: students ?? 0,
            classes: classes ?? 0,
            minutes: Number(minutes ?? 0),
          };
        });
      } else if (this.isTeacher) {
        // Home teacher class-level summary
        const classStudents = await this.data.getStudentsByClass(this.schoolId, this.teacherClassId);
        this.calculateSummaryFromStudents(classStudents, 1);
      } else if (this.isSubjectTeacher) {
        // Subject teacher multi-class summary
        const allStudents = await this.data.getStudentsForSubjectTeacher(this.schoolId, this.subjectTeacherClassIds);
        this.calculateSummaryFromStudents(allStudents, visibleClasses.length);
      }

      this.zone.run(() => {
        this.classes = visibleClasses
          .slice()
          .sort((a: SchoolClass, b: SchoolClass) => (a.name ?? '').localeCompare(b.name ?? ''));

        this.loading = false;

        // ✅ Auto-select logic
        if (this.isTeacher) {
          this.selectedClassId = this.teacherClassId;
          this.selectClass(this.teacherClassId);
        } else if (this.classes.length > 0) {
          // Both Principal and Subject Teacher auto-select the first visible class
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

  // ✅ Extracted summary calculation so both teacher types can use it
  private calculateSummaryFromStudents(students: Student[], classCount: number) {
    const safe = (students ?? []).map((s: Student) => ({
      ...s,
      grade: Number(s.grade ?? 0),
      completion: Number(s.completion ?? 0),
      minutesRecorded: Number(s.minutesRecorded ?? 0),
    }));

    const totalMinutes = safe.reduce(
      (sum: number, s: Student) => sum + Number(s.minutesRecorded ?? 0),
      0
    );

    this.zone.run(() => {
      this.summary = {
        teachers: 1, // teacher view: not meaningful school-wide
        students: safe.length,
        classes: classCount,
        minutes: totalMinutes,
      };
    });
  }

  async selectClass(classId: string) {
    // ✅ Security: Ensure teachers can only select authorized classes
    if (this.isTeacher && classId !== this.teacherClassId) return;
    if (this.isSubjectTeacher && !this.subjectTeacherClassIds.includes(classId)) return;

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

      const safeStudents: Student[] = (students ?? []).map((s: Student) => ({
        ...s,
        grade: Number(s.grade ?? 0),
        completion: Number(s.completion ?? 0),
        minutesRecorded: Number(s.minutesRecorded ?? 0),
      }));

      const studentCount = safeStudents.length;

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
        ? safeStudents.reduce((a: number, b: Student) => a + Number(b.grade ?? 0), 0) / studentCount
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