import {
  Component,
  inject,
  OnDestroy,
  OnInit,
  NgZone,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, of, firstValueFrom } from 'rxjs';
import { catchError, filter, take, takeUntil, timeout } from 'rxjs/operators';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { TranslateService, TranslatePipe } from '@ngx-translate/core';

import { DataService, Student, SchoolClass } from '../../core/services/data.service';
import { RoleService } from '../../core/services/role.service';
import { StudentFormDialog, ClassOption } from './student-form-dialog/student-form-dialog';

@Component({
  selector: 'app-students',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    MatIconModule,
    MatButtonModule,
    TranslatePipe
  ],
  templateUrl: './students.html',
  styleUrls: ['./students.scss'],
})
export class Students implements OnInit, OnDestroy {
  private data = inject(DataService);
  private role = inject(RoleService);
  private dialog = inject(MatDialog);
  private zone = inject(NgZone);
  private cdr = inject(ChangeDetectorRef);
  private translate = inject(TranslateService);
  private destroy$ = new Subject<void>();

  loading = true;
  error = '';
  schoolId = '';
  q = '';

  students: Student[] = [];
  classes: SchoolClass[] = [];
  classNameById = new Map<string, string>();

  isTeacher = false;
  teacherClassId = '';

  displayedColumns: string[] = ['studentId', 'name', 'email', 'classId', 'actions'];

  get filtered(): Student[] {
    const s = this.q.trim().toLowerCase();
    if (!s) return this.students;

    return this.students.filter((st) => {
      const className = this.classNameById.get(st.classId ?? '') ?? '';
      return (
        (st.studentId ?? '').toLowerCase().includes(s) ||
        (st.fullName ?? '').toLowerCase().includes(s) ||
        (st.email ?? '').toLowerCase().includes(s) ||
        (className ?? '').toLowerCase().includes(s)
      );
    });
  }

  classLabel(st: Student): string {
    const id = (st.classId ?? '').toString();
    if (!id) return 'Unassigned';
    return this.classNameById.get(id) ?? id;
  }

  ngOnInit(): void {
    this.zone.run(() => {
      this.loading = true;
      this.error = '';
      this.students = [];
      this.classes = [];
      this.classNameById = new Map();
      this.isTeacher = false;
      this.teacherClassId = '';
    });
    this.cdr.detectChanges();

    this.role.claims$
      .pipe(
        timeout(8000),
        catchError((err) => {
          console.error('[Students] claims$ failed:', err);
          this.zone.run(() => {
            this.error = this.translate.instant('STUDENTS.MESSAGES.ERROR_CLAIMS');
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
        this.isTeacher = roleStr === 'teacher';
        const isParent = roleStr === 'parent'; 

        this.teacherClassId = (claims.classId ?? claims.classIds?.[0] ?? '').toString();
        
        if (isParent) this.isTeacher = true; 

        if (this.isTeacher && !this.teacherClassId && !isParent) {
          this.zone.run(() => {
            this.error = this.translate.instant('STUDENTS.MESSAGES.ERROR_ACCOUNT');
            this.loading = false;
          });
          this.cdr.detectChanges();
          return;
        }
        this.loadAll();
      });
  }

  private async loadAll() {
    try {
      this.zone.run(() => (this.loading = true));
      this.cdr.detectChanges();

      const [classes, students] = await Promise.all([
        this.data.getClasses(this.schoolId),
        this.isTeacher
          ? this.data.getStudentsByClass(this.schoolId, this.teacherClassId)
          : this.data.getStudents(this.schoolId),
      ]);

      this.zone.run(() => {
        const allClasses = classes ?? [];
        if (this.isTeacher && !this.teacherClassId && allClasses.length > 0) {
            this.teacherClassId = allClasses[0].id!;
        }
        this.classes = this.isTeacher ? allClasses.filter((c) => c.id === this.teacherClassId) : allClasses;
        this.classNameById = new Map((this.classes ?? []).filter((c) => !!c.id).map((c) => [c.id!, c.name]));
        this.students = students ?? [];
        this.loading = false;
      });
      this.cdr.detectChanges();
    } catch (e) {
      this.zone.run(() => {
        this.error = this.translate.instant('STUDENTS.MESSAGES.ERROR_LOAD');
        this.loading = false;
      });
      this.cdr.detectChanges();
    }
  }

  private classOptions(): ClassOption[] {
    return (this.classes ?? []).filter((c) => !!c.id).map((c) => ({ id: c.id!, name: c.name }));
  }

  async addStudent() {
    if (!this.schoolId) return;
    const ref = this.dialog.open(StudentFormDialog, {
      width: '520px',
      data: {
        title: this.translate.instant('STUDENT_DIALOG.TITLE_ADD'),
        classes: this.classOptions(),
        initial: this.isTeacher ? { classId: this.teacherClassId } : undefined,
        lockClass: this.isTeacher, 
      },
    });

    const result = await firstValueFrom(ref.afterClosed());
    if (!result) return;

    const payload = this.isTeacher ? { ...result, classId: this.teacherClassId } : result;
    this.zone.run(() => (this.loading = true));
    try {
      await this.data.createStudent(this.schoolId, payload);
      await this.loadAll();
    } catch (e) {
      this.zone.run(() => (this.error = this.translate.instant('STUDENTS.MESSAGES.ERROR_CREATE')));
    } finally {
      this.zone.run(() => (this.loading = false));
      this.cdr.detectChanges();
    }
  }

  async editStudent(st: Student) {
    if (!st.id) return;
    if (this.isTeacher && st.classId !== this.teacherClassId) {
      alert(this.translate.instant('STUDENTS.MESSAGES.RESTRICT_EDIT'));
      return;
    }

    const ref = this.dialog.open(StudentFormDialog, {
      width: '520px',
      data: {
        title: this.translate.instant('STUDENT_DIALOG.TITLE_EDIT'),
        classes: this.classOptions(),
        initial: { studentId: st.studentId, fullName: st.fullName, email: st.email, classId: st.classId },
        lockClass: this.isTeacher, 
      },
    });

    const result = await firstValueFrom(ref.afterClosed());
    if (!result) return;

    const payload = this.isTeacher ? { ...result, classId: this.teacherClassId } : result;
    this.zone.run(() => (this.loading = true));
    try {
      await this.data.updateStudent(st.id, payload);
      await this.loadAll();
    } catch (e) {
      this.zone.run(() => (this.error = this.translate.instant('STUDENTS.MESSAGES.ERROR_UPDATE')));
    } finally {
      this.zone.run(() => (this.loading = false));
      this.cdr.detectChanges();
    }
  }
  
  async deleteStudent(st: Student) {
    if (!st.id) return;
    if (this.isTeacher && st.classId !== this.teacherClassId) {
      alert(this.translate.instant('STUDENTS.MESSAGES.RESTRICT_DELETE'));
      return;
    }

    const msg = this.translate.instant('STUDENTS.MESSAGES.DELETE_CONFIRM');
    const ok = confirm(`${msg} "${st.fullName}"?`);
    if (!ok) return;

    this.zone.run(() => (this.loading = true));
    try {
      await this.data.deleteStudent(st.id);
      await this.loadAll();
    } catch (e) {
      this.zone.run(() => (this.error = this.translate.instant('STUDENTS.MESSAGES.ERROR_DELETE')));
    } finally {
      this.zone.run(() => (this.loading = false));
      this.cdr.detectChanges();
    }
  }

  exportToCSV() {
    if (this.filtered.length === 0) return;
    const headers = ['Student ID', 'Full Name', 'Email', 'Assigned Class'];
    const rows = this.filtered.map(s => [
      `"${s.studentId || ''}"`,
      `"${s.fullName || 'Unnamed'}"`,
      `"${s.email || s.loginEmail || ''}"`,
      `"${this.classLabel(s).replace(/"/g, '""')}"`
    ]);
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `students_export_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}