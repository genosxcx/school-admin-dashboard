import { Component, inject, OnDestroy, OnInit, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, of } from 'rxjs';
import { catchError, filter, take, takeUntil, timeout } from 'rxjs/operators';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';

// ✅ Translate
import { TranslateService, TranslatePipe } from '@ngx-translate/core';

import { DataService, SchoolClass, Student } from '../../core/services/data.service';
import { RoleService } from '../../core/services/role.service';

type Summary = {
  teachers: number;
  students: number;
  classes: number;
  minutes: number;
  avgGrade: number;
  avgCompletion: number;
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
    CommonModule, MatCardModule, MatIconModule, MatButtonModule,
    MatProgressBarModule, TranslatePipe // ✅ Pipe Added
  ],
  templateUrl: './stats.html',
  styleUrls: ['./stats.scss'],
})
export class Stats implements OnInit, OnDestroy {
  private data = inject(DataService);
  private role = inject(RoleService);
  private zone = inject(NgZone);
  private cdr = inject(ChangeDetectorRef);
  private translate = inject(TranslateService); // ✅ Injected
  private destroy$ = new Subject<void>();

  loading = true;
  error = '';
  schoolId = '';

  isPrincipal = false;
  isTeacher = false;
  isSubjectTeacher = false;

  teacherClassId = '';
  subjectTeacherClassIds: string[] = [];

  summary: Summary = { teachers: 0, students: 0, classes: 0, minutes: 0, avgGrade: 0, avgCompletion: 0 };

  classes: SchoolClass[] = [];
  selectedClassId = '';
  selectedClassStats: ClassStats | null = null;
  classStudents: Student[] = [];

  ngOnInit(): void {
    this.zone.run(() => { this.loading = true; this.error = ''; });
    this.cdr.detectChanges();

    this.role.claims$
      .pipe(
        timeout(8000),
        catchError((err) => {
          this.zone.run(() => {
            this.error = this.translate.instant('STATS.MESSAGES.ERROR_CLAIMS');
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
        this.isPrincipal = roleStr === 'principal' || roleStr === 'admin' || roleStr === 'parent';
        this.isTeacher = roleStr === 'teacher';
        this.isSubjectTeacher = roleStr === 'subject_teacher';

        this.teacherClassId = (claims.classId ?? '').toString();
        this.subjectTeacherClassIds = Array.isArray(claims.classIds) ? claims.classIds : [];

        if (this.isTeacher && !this.teacherClassId) {
          this.zone.run(() => { this.error = this.translate.instant('STATS.MESSAGES.ERROR_ACCOUNT'); this.loading = false; });
          this.cdr.detectChanges();
          return;
        }

        if (this.isSubjectTeacher && this.subjectTeacherClassIds.length === 0) {
          this.zone.run(() => { this.error = this.translate.instant('STATS.MESSAGES.ERROR_SUB_TEACHER'); this.loading = false; });
          this.cdr.detectChanges();
          return;
        }

        this.loadOverview();
      });
  }

  private async getAllAccessibleStudents(visibleClasses: SchoolClass[]): Promise<Student[]> {
    if (this.isTeacher && this.teacherClassId) {
      return await this.data.getStudentsByClass(this.schoolId, this.teacherClassId) ?? [];
    } else if (this.isSubjectTeacher && this.subjectTeacherClassIds.length > 0) {
      return await this.data.getStudentsForSubjectTeacher(this.schoolId, this.subjectTeacherClassIds) ?? [];
    } else if (visibleClasses.length > 0) {
      const arrays = await Promise.all(visibleClasses.map(c => this.data.getStudentsByClass(this.schoolId, c.id!)));
      return arrays.flat();
    }
    return [];
  }

  private async loadOverview() {
    try {
      this.zone.run(() => (this.loading = true));
      this.cdr.detectChanges();

      const classList = await this.data.getClasses(this.schoolId);
      let visibleClasses = classList ?? [];
      
      if (this.isTeacher) {
        visibleClasses = visibleClasses.filter((c) => c.id === this.teacherClassId);
      } else if (this.isSubjectTeacher) {
        visibleClasses = visibleClasses.filter((c) => c.id && this.subjectTeacherClassIds.includes(c.id));
      }

      const allStudents = await this.getAllAccessibleStudents(visibleClasses);
      this.calculateSummaryFromStudents(allStudents, visibleClasses.length);

      let displayClasses = visibleClasses.slice().sort((a: SchoolClass, b: SchoolClass) => (a.name ?? '').localeCompare(b.name ?? ''));

      if (!this.isTeacher && displayClasses.length > 1) {
        displayClasses = [
          { id: 'ALL', name: this.translate.instant('STATS.ALL_CLASSES'), schoolId: this.schoolId } as SchoolClass, 
          ...displayClasses
        ];
      }

      this.zone.run(() => {
        this.classes = displayClasses;
        this.loading = false;
        if (this.classes.length > 0) this.selectClass(this.classes[0].id!);
      });
      this.cdr.detectChanges();
    } catch (e) {
      this.zone.run(() => { this.error = this.translate.instant('STATS.MESSAGES.ERROR_LOAD'); this.loading = false; });
      this.cdr.detectChanges();
    }
  }

  private calculateSummaryFromStudents(students: Student[], classCount: number) {
    const safe = (students ?? []).map((s: Student) => ({ ...s, grade: Number(s.grade ?? 0), completion: Number(s.completion ?? 0), minutesRecorded: Number(s.minutesRecorded ?? 0), }));
    const studentCount = safe.length;
    const totalMinutes = safe.reduce((sum: number, s: Student) => sum + Number(s.minutesRecorded ?? 0), 0);
    const completionValues: number[] = safe.map((s: Student) => { const v = Number(s.completion ?? 0); return v <= 1 ? v * 100 : v; });
    const avgCompletion = studentCount ? completionValues.reduce((a: number, b: number) => a + b, 0) / studentCount : 0;
    const avgGrade = studentCount ? safe.reduce((a: number, b: Student) => a + Number(b.grade ?? 0), 0) / studentCount : 0;

    this.zone.run(() => {
      this.summary = { teachers: 1, students: studentCount, classes: classCount, minutes: totalMinutes, avgGrade, avgCompletion, };
    });
  }

  async selectClass(classId: string) {
    if (this.isTeacher && classId !== this.teacherClassId) return;
    if (this.isSubjectTeacher && classId !== 'ALL' && !this.subjectTeacherClassIds.includes(classId)) return;

    this.selectedClassId = classId;
    const cls = this.classes.find((c) => c.id === classId);
    const className = cls?.name ?? 'Class';

    this.zone.run(() => { this.selectedClassStats = null; this.classStudents = []; this.error = ''; });
    this.cdr.detectChanges();

    try {
      let students: Student[] = [];
      if (classId === 'ALL') {
        const actualClasses = this.classes.filter(c => c.id !== 'ALL');
        students = await this.getAllAccessibleStudents(actualClasses);
      } else {
        students = await this.data.getStudentsByClass(this.schoolId, classId);
      }

      const safeStudents: Student[] = (students ?? []).map((s: Student) => ({ ...s, grade: Number(s.grade ?? 0), completion: Number(s.completion ?? 0), minutesRecorded: Number(s.minutesRecorded ?? 0), }));
      const studentCount = safeStudents.length;
      const totalMinutes = safeStudents.reduce((sum: number, s: Student) => sum + Number(s.minutesRecorded ?? 0), 0);
      const completionValues: number[] = safeStudents.map((s: Student) => { const v = Number(s.completion ?? 0); return v <= 1 ? v * 100 : v; });
      const avgCompletion = studentCount ? completionValues.reduce((a: number, b: number) => a + b, 0) / studentCount : 0;
      const avgGrade = studentCount ? safeStudents.reduce((a: number, b: Student) => a + Number(b.grade ?? 0), 0) / studentCount : 0;

      this.zone.run(() => {
        this.classStudents = safeStudents;
        this.selectedClassStats = { classId, className, studentCount, totalMinutes, avgGrade, avgCompletion, };
      });
      this.cdr.detectChanges();
    } catch (e) {
      this.zone.run(() => { this.error = this.translate.instant('STATS.MESSAGES.ERROR_SELECT'); });
      this.cdr.detectChanges();
    }
  }

  completionPct(s: Student): number { const v = Number(s.completion ?? 0); const pct = v <= 1 ? v * 100 : v; return Math.max(0, Math.min(100, pct)); }
  gradePct(s: Student): number { const v = Number(s.grade ?? 0); return Math.max(0, Math.min(100, v)); }
  minutesText(n: number): string { return (Math.round(n * 10) / 10).toString(); }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
}