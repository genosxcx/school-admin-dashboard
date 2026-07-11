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
import { AssignmentSummaryDialog } from './assignment-summary-dialog/assignment-summary-dialog';

// ✅ Added Translate Service and Pipe
import { TranslateService, TranslatePipe } from '@ngx-translate/core';

import { DataService, Assignment, SchoolClass } from '../../core/services/data.service';
import { RoleService } from '../../core/services/role.service';
import { AssignmentFormDialog, ClassOption } from './assignment-form-dialog/assignment-form-dialog';

@Component({
  selector: 'app-assignments',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatCardModule, MatFormFieldModule,
    MatInputModule, MatTableModule, MatIconModule, MatButtonModule,
    DatePipe, TranslatePipe // ✅ Added Pipe
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
  private translate = inject(TranslateService); // ✅ Injected
  private destroy$ = new Subject<void>();

  loading = true;
  error = '';
  schoolId = '';
  teacherId = '';
  q = '';

  assignments: Assignment[] = [];
  classes: SchoolClass[] = [];
  classNameById = new Map<string, string>();

  displayedColumns = ['title', 'description', 'classes', 'date', 'actions'];

  // ✅ NEW: maps stored fontFamily key -> real CSS font stack
  readonly fontMap: Record<string, string> = {
    Naskh: "'Noto Naskh Arabic', 'Traditional Arabic', serif",
    Ruqaa: "'Aref Ruqaa', serif",
    Kufi: "'Noto Kufi Arabic', sans-serif",
    Thuluth: "'Aref Ruqaa', 'Amiri', serif",
  };

  // ✅ NEW: returns an ngStyle object for a given assignment
  getAssignmentStyle(a: Assignment) {
    const key = a.fontFamily || 'Naskh';
    return {
      'font-family': this.fontMap[key] || this.fontMap['Naskh'],
      'font-size.px': a.fontSize || 20,
    };
  }

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

  // ✅ Updated to use translation
  classesLabel(a: Assignment): string {
    if (!a.classIds || a.classIds.length === 0) return this.translate.instant('ASSIGNMENTS.UNASSIGNED');
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
            this.error = this.translate.instant('ASSIGNMENTS.MESSAGES.TIMEOUT');
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
              this.error = this.translate.instant('ASSIGNMENTS.MESSAGES.INVALID_ID');
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

      const [classes, assignments] = await Promise.all([
        this.data.getClasses(this.schoolId),
        this.data.getAssignmentsForTeacher(this.schoolId, this.teacherId),
      ]);

      this.zone.run(() => {
        this.classes = classes ?? [];
        this.classNameById = new Map(
          this.classes.filter((c) => c && c.id).map((c) => [c.id!, c.name])
        );

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
      data: { 
        // ✅ Translate the title before passing it
        title: this.translate.instant('ASSIGNMENTS.CREATE_BTN'), 
        classes: this.classOptions() 
      },
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
        this.error = this.translate.instant('ASSIGNMENTS.MESSAGES.CREATE_FAILED') + (e instanceof Error ? e.message : String(e));
        this.loading = false;
      });
      this.cdr.detectChanges();
    }
  }
openSummary(a: Assignment) {
  this.dialog.open(AssignmentSummaryDialog, {
    width: '400px',
    data: {
      ...a,
      classNames: this.classesLabel(a), // ✅ NEW: resolved names as a string
    },
  });
}
  async deleteAssignment(a: Assignment) {
    if (!a.id) return;
    // ✅ Use translation for native confirm
    const ok = confirm(this.translate.instant('ASSIGNMENTS.MESSAGES.DELETE_CONFIRM'));
    if (!ok) return;

    try {
      this.zone.run(() => (this.loading = true));
      this.cdr.detectChanges();

      await this.data.deleteAssignment(a.id);
      await this.loadAll();
    } catch (e) {
      console.error('[Assignments] delete error:', e);
      this.zone.run(() => {
        this.error = this.translate.instant('ASSIGNMENTS.MESSAGES.DELETE_FAILED');
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