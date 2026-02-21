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

import { DataService, Teacher, SchoolClass } from '../../core/services/data.service';
import { RoleService } from '../../core/services/role.service';
import { TeacherFormDialog, ClassOption } from './teacher-form-dialog/teacher-form-dialog';

@Component({
  selector: 'app-teachers',
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
  templateUrl: './teachers.html',
  styleUrls: ['./teachers.scss'],
})
export class Teachers implements OnInit, OnDestroy {
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

  teachers: Teacher[] = [];
  classes: SchoolClass[] = [];
  classNameById = new Map<string, string>();

  displayedColumns = ['name', 'email', 'classId', 'actions'];

  get filtered(): Teacher[] {
    const s = this.q.trim().toLowerCase();
    if (!s) return this.teachers;

    return this.teachers.filter((t) => {
      const className = this.classNameById.get(t.classId ?? '') ?? '';
      return (
        (t.fullName ?? '').toLowerCase().includes(s) ||
        (t.email ?? '').toLowerCase().includes(s) ||
        (className ?? '').toLowerCase().includes(s)
      );
    });
  }

  classLabel(t: Teacher): string {
    const id = (t.classId ?? '').toString();
    if (!id) return 'Unassigned';
    return this.classNameById.get(id) ?? id;
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
          console.error('[Teachers] claims$ timeout/error:', err);
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
          console.log('[Teachers] Claims received:', claims);
          
          if (claims && claims.schoolId) {
            this.schoolId = claims.schoolId;
            console.log('[Teachers] School ID set to:', this.schoolId);
            this.loadAll();
          } else {
            console.warn('[Teachers] Claims missing schoolId');
            this.zone.run(() => {
              this.error = 'Your school ID is not configured.';
              this.loading = false;
            });
            this.cdr.detectChanges();
          }
        },
        error: (err) => {
          console.error('[Teachers] Claims subscription error:', err);
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
      if (!this.schoolId) {
        throw new Error('School ID is empty');
      }

      this.zone.run(() => (this.loading = true));
      this.cdr.detectChanges();

      console.log('[Teachers] loadAll starting for schoolId:', this.schoolId);

      const [classes, teachers] = await Promise.all([
        this.data.getClasses(this.schoolId),
        this.data.getTeachers(this.schoolId),
      ]);

      this.zone.run(() => {
        this.classes = classes ?? [];
        this.classNameById = new Map(
          (this.classes ?? [])
            .filter((c) => c && c.id)
            .map((c) => [c.id!, c.name])
        );

        this.teachers = teachers ?? [];
        this.loading = false;
        this.error = '';
        
        console.log('[Teachers] Data loaded:', {
          classCount: this.classes.length,
          teacherCount: this.teachers.length,
        });
      });

      this.cdr.detectChanges();
    } catch (e) {
      console.error('[Teachers] loadAll error:', e);
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

  async addTeacher() {
    if (!this.schoolId) {
      this.error = 'School ID not found';
      return;
    }

    const ref = this.dialog.open(TeacherFormDialog, {
      width: '520px',
      data: { title: 'Add teacher', classes: this.classOptions() },
    });

    try {
      const result = await firstValueFrom(ref.afterClosed());
      if (!result) return;

      this.zone.run(() => (this.loading = true));
      this.cdr.detectChanges();

      await this.data.createTeacher(this.schoolId, result);
      await this.loadAll();
    } catch (e) {
      console.error('[Teachers] addTeacher error:', e);
      this.zone.run(() => {
        this.error = `Failed to create teacher: ${e instanceof Error ? e.message : String(e)}`;
        this.loading = false;
      });
      this.cdr.detectChanges();
    }
  }

  async editTeacher(t: Teacher) {
    if (!t.id) return;

    const ref = this.dialog.open(TeacherFormDialog, {
      width: '520px',
      data: {
        title: 'Edit teacher',
        classes: this.classOptions(),
        initial: { fullName: t.fullName, email: t.email, classId: t.classId },
      },
    });

    try {
      const result = await firstValueFrom(ref.afterClosed());
      if (!result) return;

      this.zone.run(() => (this.loading = true));
      this.cdr.detectChanges();

      await this.data.updateTeacher(t.id, result);
      await this.loadAll();
    } catch (e) {
      console.error('[Teachers] editTeacher error:', e);
      this.zone.run(() => {
        this.error = `Failed to update teacher: ${e instanceof Error ? e.message : String(e)}`;
        this.loading = false;
      });
      this.cdr.detectChanges();
    }
  }

  async deleteTeacher(t: Teacher) {
    if (!t.id) return;

    const ok = confirm(`Delete teacher "${t.fullName}"?`);
    if (!ok) return;

    try {
      this.zone.run(() => (this.loading = true));
      this.cdr.detectChanges();

      await this.data.deleteTeacher(t.id);
      await this.loadAll();
    } catch (e) {
      console.error('[Teachers] deleteTeacher error:', e);
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