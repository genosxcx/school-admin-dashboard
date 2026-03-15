import { Component, inject, OnDestroy, OnInit, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
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

import { DataService, Assignment, SchoolClass } from '../../core/services/data.service';
import { RoleService } from '../../core/services/role.service';
import { AssignmentFormDialog, ClassOption } from './assignment-form-dialog/assignment-form-dialog';

@Component({
  selector: 'app-assignments',
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
    DatePipe
  ],
  templateUrl: './assignments.html',
  styleUrls: ['./assignments.scss'],
})
export class Assignments implements OnInit, OnDestroy {
  private data = inject(DataService);
  private role = inject(RoleService);
  private dialog = inject(MatDialog);
  private zone = inject(NgZone);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();

  loading = true;
  error = '';
  schoolId = '';
  teacherId = ''; // The UID of the logged-in user
  q = '';

  assignments: Assignment[] = [];
  classes: SchoolClass[] = [];
  classNameById = new Map<string, string>();

  displayedColumns = ['title', 'description', 'classes', 'date', 'actions'];

  get filtered(): Assignment[] {
    const s = this.q.trim().toLowerCase();
    if (!s) return this.assignments;

    return this.assignments.filter((a) => {
      const classNames = this.classesLabel(a).toLowerCase();
      return (
        (a.title ?? '').toLowerCase().includes(s) ||
        (a.description ?? '').toLowerCase().includes(s) ||
        classNames.includes(s)
      );
    });
  }

  classesLabel(a: Assignment): string {
    if (!a.classIds || a.classIds.length === 0) return 'Unassigned';
    return a.classIds
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
          this.zone.run(() => {
            this.error = 'Timeout loading user info.';
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
          if (claims && claims.schoolId && claims.uid) {
            this.schoolId = claims.schoolId;
            this.teacherId = claims.uid;
            this.loadAll();
          } else {
            this.zone.run(() => {
              this.error = 'Invalid school or user ID.';
              this.loading = false;
            });
            this.cdr.detectChanges();
          }
        }
      });
  }

  private async loadAll() {
    try {
      this.zone.run(() => (this.loading = true));
      this.cdr.detectChanges();

      // Fetch all school classes and only the assignments created by this specific teacher
      const [classes, assignments] = await Promise.all([
        this.data.getClasses(this.schoolId),
        this.data.getAssignmentsForTeacher(this.schoolId, this.teacherId),
      ]);

      this.zone.run(() => {
        this.classes = classes ?? [];
        this.classNameById = new Map(
          this.classes.filter((c) => c && c.id).map((c) => [c.id!, c.name])
        );

        // Sort assignments by date (newest first)
        this.assignments = (assignments ?? []).sort((a, b) => b.createdAt - a.createdAt);
        this.loading = false;
        this.error = '';
      });

      this.cdr.detectChanges();
    } catch (e) {
      this.zone.run(() => {
        this.error = `Error: ${e instanceof Error ? e.message : String(e)}`;
        this.loading = false;
      });
      this.cdr.detectChanges();
    }
  }

  private classOptions(): ClassOption[] {
    return this.classes.filter((c) => c && c.id).map((c) => ({ id: c.id!, name: c.name }));
  }

  async addAssignment() {
    const ref = this.dialog.open(AssignmentFormDialog, {
      width: '520px',
      data: { title: 'Create New Assignment', classes: this.classOptions() },
    });

    try {
      const result = await firstValueFrom(ref.afterClosed());
      if (!result) return;

      this.zone.run(() => (this.loading = true));
      this.cdr.detectChanges();

      await this.data.createAssignment(this.schoolId, this.teacherId, result);
      await this.loadAll();
    } catch (e) {
      console.error('[Assignments] add error:', e);
      this.zone.run(() => {
        this.error = `Failed to create assignment: ${e instanceof Error ? e.message : String(e)}`;
        this.loading = false;
      });
      this.cdr.detectChanges();
    }
  }

  async deleteAssignment(a: Assignment) {
    if (!a.id) return;
    const ok = confirm(`Are you sure you want to delete "${a.title}"?`);
    if (!ok) return;

    try {
      this.zone.run(() => (this.loading = true));
      this.cdr.detectChanges();

      await this.data.deleteAssignment(a.id);
      await this.loadAll();
    } catch (e) {
      console.error('[Assignments] delete error:', e);
      this.zone.run(() => {
        this.error = `Failed to delete assignment.`;
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