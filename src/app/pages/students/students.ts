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
  private destroy$ = new Subject<void>();

  loading = true;
  error = '';
  schoolId = '';
  q = '';

  students: Student[] = [];
  classes: SchoolClass[] = [];
  classNameById = new Map<string, string>();

  displayedColumns = ['name', 'email', 'classId', 'actions'];

  get filtered(): Student[] {
    const s = this.q.trim().toLowerCase();
    if (!s) return this.students;

    return this.students.filter((st) => {
      const className = this.classNameById.get(st.classId ?? '') ?? '';
      return (
        (st.fullName ?? '').toLowerCase().includes(s) ||
        (st.email ?? '').toLowerCase().includes(s) ||
        (className ?? '').toLowerCase().includes(s)
      );
    });
  }

  classLabel(st: Student): string {
    const id = (st.classId ?? '').toString();
    if (!id) return 'Unassigned';
    return this.classNameById.get(id) ?? id; // fallback to id if not found
  }

  ngOnInit(): void {
    this.zone.run(() => {
      this.loading = true;
      this.error = '';
      this.students = [];
      this.classes = [];
      this.classNameById = new Map();
    });
    this.cdr.detectChanges();

    this.role.claims$
      .pipe(
        timeout(8000),
        catchError((err) => {
          console.error('[Students] claims$ failed:', err);
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
        this.loadAll();
      });
  }

  private async loadAll() {
    try {
      this.zone.run(() => (this.loading = true));
      this.cdr.detectChanges();

      const [classes, students] = await Promise.all([
        this.data.getClasses(this.schoolId),
        this.data.getStudents(this.schoolId),
      ]);

      this.zone.run(() => {
        this.classes = classes ?? [];
        this.classNameById = new Map(
          (this.classes ?? []).filter(c => !!c.id).map(c => [c.id!, c.name])
        );

        this.students = students ?? [];
        this.loading = false;
      });
      this.cdr.detectChanges();
    } catch (e) {
      console.error('[Students] loadAll failed:', e);
      this.zone.run(() => {
        this.error = 'Failed to load students.';
        this.loading = false;
      });
      this.cdr.detectChanges();
    }
  }

  private classOptions(): ClassOption[] {
    return (this.classes ?? [])
      .filter((c) => !!c.id)
      .map((c) => ({ id: c.id!, name: c.name }));
  }

  async addStudent() {
    if (!this.schoolId) return;

    const ref = this.dialog.open(StudentFormDialog, {
      width: '520px',
      data: { title: 'Add student', classes: this.classOptions() },
    });

    const result = await firstValueFrom(ref.afterClosed());
    if (!result) return;

    this.zone.run(() => (this.loading = true));
    this.cdr.detectChanges();

    try {
      await this.data.createStudent(this.schoolId, result);
      await this.loadAll();
    } catch (e) {
      console.error(e);
      this.zone.run(() => (this.error = 'Failed to create student.'));
    } finally {
      this.zone.run(() => (this.loading = false));
      this.cdr.detectChanges();
    }
  }

  async editStudent(st: Student) {
    if (!st.id) return;

    const ref = this.dialog.open(StudentFormDialog, {
      width: '520px',
      data: {
        title: 'Edit student',
        classes: this.classOptions(),
        initial: { fullName: st.fullName, email: st.email, classId: st.classId },
      },
    });

    const result = await firstValueFrom(ref.afterClosed());
    if (!result) return;

    this.zone.run(() => (this.loading = true));
    this.cdr.detectChanges();

    try {
      await this.data.updateStudent(st.id, result);
      await this.loadAll();
    } catch (e) {
      console.error(e);
      this.zone.run(() => (this.error = 'Failed to update student.'));
    } finally {
      this.zone.run(() => (this.loading = false));
      this.cdr.detectChanges();
    }
  }

  async deleteStudent(st: Student) {
    if (!st.id) return;

    const ok = confirm(`Delete student "${st.fullName}"?`);
    if (!ok) return;

    this.zone.run(() => (this.loading = true));
    this.cdr.detectChanges();

    try {
      await this.data.deleteStudent(st.id);
      await this.loadAll();
    } catch (e) {
      console.error(e);
      this.zone.run(() => (this.error = 'Failed to delete student.'));
    } finally {
      this.zone.run(() => (this.loading = false));
      this.cdr.detectChanges();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
