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
import { Subject, of, firstValueFrom, from } from 'rxjs';
import { catchError, filter, take, takeUntil, timeout } from 'rxjs/operators';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';

import { DataService, SubjectTeacher, SchoolClass } from '../../../core/services/data.service';
import { RoleService } from '../../../core/services/role.service';
import { SubjectTeacherFormDialog, ClassOption } from '../subject-teacher-form-dialog/subject-teacher-form-dialog';

@Component({
  selector: 'app-subject-teachers',
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
  templateUrl: './subject-teachers.html',
  styleUrls: ['./subject-teachers.scss'], // Assuming you use the same/similar styles
})
export class SubjectTeachers implements OnInit, OnDestroy {
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

  subjectTeachers: SubjectTeacher[] = [];
  classes: SchoolClass[] = [];
  classNameById = new Map<string, string>();

  // Added 'subject' and changed 'classId' to 'classes'
  displayedColumns = ['name', 'email', 'subject', 'classes', 'actions'];

  get filtered(): SubjectTeacher[] {
    const s = this.q.trim().toLowerCase();
    if (!s) return this.subjectTeachers;

    return this.subjectTeachers.filter((t) => {
      const classNames = this.classesLabel(t).toLowerCase();
      return (
        (t.fullName ?? '').toLowerCase().includes(s) ||
        (t.email ?? '').toLowerCase().includes(s) ||
        (t.subject ?? '').toLowerCase().includes(s) ||
        classNames.includes(s)
      );
    });
  }

  // Maps the array of classIds to a comma-separated string of class names
  classesLabel(t: SubjectTeacher): string {
    if (!t.classIds || t.classIds.length === 0) return 'Unassigned';
    return t.classIds
      .map(id => this.classNameById.get(id))
      .filter(name => !!name)
      .join(', ');
  }

  ngOnInit(): void {
    this.zone.run(() => {
      this.loading = true;
      this.error = '';
    });

    this.role.claims$
      .pipe(
        timeout(12000),
        catchError((err) => {
          console.error('[SubjectTeachers] claims$ timeout/error:', err);
          this.zone.run(() => {
            this.error = 'Timeout loading school info. Please refresh.';
            this.loading = false;
          });
          this.cdr.detectChanges();
          return of(null);
        }),
        filter((c) => c !== null && c !== undefined),
        take(1),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (claims) => {
          if (claims && claims.schoolId) {
            this.schoolId = claims.schoolId;
            this.loadAll();
          } else {
            this.zone.run(() => {
              this.error = 'Your school ID is not configured.';
              this.loading = false;
            });
            this.cdr.detectChanges();
          }
        },
        error: (err) => {
          console.error('[SubjectTeachers] Claims subscription error:', err);
          this.zone.run(() => {
            this.error = 'Failed to load your school info.';
            this.loading = false;
          });
          this.cdr.detectChanges();
        },
      });
  }

  private async loadAll() {
    try {
      if (!this.schoolId) throw new Error('School ID is empty');

      this.zone.run(() => (this.loading = true));
      this.cdr.detectChanges();

      const [classes, teachers] = await Promise.all([
        this.data.getClasses(this.schoolId),
        this.data.getSubjectTeachers(this.schoolId),
      ]);

      this.zone.run(() => {
        this.classes = classes ?? [];
        this.classNameById = new Map(
          (this.classes ?? [])
            .filter((c) => c && c.id)
            .map((c) => [c.id!, c.name])
        );

        this.subjectTeachers = teachers ?? [];
        this.loading = false;
        this.error = '';
      });

      this.cdr.detectChanges();
    } catch (e) {
      console.error('[SubjectTeachers] loadAll error:', e);
      this.zone.run(() => {
        this.error = `Error: ${e instanceof Error ? e.message : String(e)}`;
        this.loading = false;
      });
      this.cdr.detectChanges();
    }
  }

  private classOptions(): ClassOption[] {
    return (this.classes ?? [])
      .filter((c) => c && c.id)
      .map((c) => ({ id: c.id!, name: c.name }));
  }

  async addSubjectTeacher() {
    if (!this.schoolId) {
      this.error = 'School ID not found';
      return;
    }

    const ref = this.dialog.open(SubjectTeacherFormDialog, {
      width: '520px',
      data: { title: 'Add subject teacher', classes: this.classOptions() },
    });

    try {
      const result = await firstValueFrom(ref.afterClosed());
      if (!result) return;

      this.zone.run(() => (this.loading = true));
      this.cdr.detectChanges();

      await this.data.createSubjectTeacher(this.schoolId, result);
      await this.loadAll();
    } catch (e) {
      console.error('[SubjectTeachers] add error:', e);
      this.zone.run(() => {
        this.error = `Failed to create teacher: ${e instanceof Error ? e.message : String(e)}`;
        this.loading = false;
      });
      this.cdr.detectChanges();
    }
  }

  async editSubjectTeacher(t: SubjectTeacher) {
    if (!t.id) return;

    const ref = this.dialog.open(SubjectTeacherFormDialog, {
      width: '520px',
      data: {
        title: 'Edit subject teacher',
        classes: this.classOptions(),
        initial: { fullName: t.fullName, email: t.email, subject: t.subject, classIds: t.classIds },
      },
    });

    try {
      const result = await firstValueFrom(ref.afterClosed());
      if (!result) return;

      this.zone.run(() => (this.loading = true));
      this.cdr.detectChanges();

      await this.data.updateSubjectTeacher(t.id, result);
      await this.loadAll();
    } catch (e) {
      console.error('[SubjectTeachers] edit error:', e);
      this.zone.run(() => {
        this.error = `Failed to update teacher: ${e instanceof Error ? e.message : String(e)}`;
        this.loading = false;
      });
      this.cdr.detectChanges();
    }
  }

  async deleteSubjectTeacher(t: SubjectTeacher) {
    if (!t.id) return;

    const ok = confirm(`Delete subject teacher "${t.fullName}"?`);
    if (!ok) return;

    try {
      this.zone.run(() => (this.loading = true));
      this.cdr.detectChanges();

      await this.data.deleteSubjectTeacher(t.id);
      await this.loadAll();
    } catch (e) {
      console.error('[SubjectTeachers] delete error:', e);
      this.zone.run(() => {
        this.error = `Failed to delete teacher: ${e instanceof Error ? e.message : String(e)}`;
        this.loading = false;
      });
      this.cdr.detectChanges();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}