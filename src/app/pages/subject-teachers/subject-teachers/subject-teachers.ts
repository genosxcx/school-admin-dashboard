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
import { TranslateService, TranslatePipe } from '@ngx-translate/core';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';

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
    MatTooltipModule,
    TranslatePipe
  ],
  templateUrl: './subject-teachers.html',
  styleUrls: ['./subject-teachers.scss'],
})
export class SubjectTeachers implements OnInit, OnDestroy {
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

  subjectTeachers: SubjectTeacher[] = [];
  classes: SchoolClass[] = [];
  classNameById = new Map<string, string>();

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

  classesLabel(t: SubjectTeacher): string {
    if (!t.classIds || t.classIds.length === 0) return this.translate.instant('SUBJECT_TEACHERS.UNASSIGNED');
    return t.classIds
      .map(id => this.classNameById.get(id))
      .filter(name => !!name)
      .join(', ');
  }

  ngOnInit(): void {
    this.zone.run(() => { this.loading = true; this.error = ''; });

    this.role.claims$.pipe(
      timeout(12000),
      catchError(() => {
        this.setError('SUBJECT_TEACHERS.ERRORS.TIMEOUT');
        return of(null);
      }),
      filter(c => !!c),
      take(1),
      takeUntil(this.destroy$)
    ).subscribe(claims => {
      if (claims?.schoolId) {
        this.schoolId = claims.schoolId;
        this.loadAll();
      } else {
        this.setError('SUBJECT_TEACHERS.ERRORS.NO_SCHOOL');
      }
    });
  }

  private setError(key: string) {
    this.zone.run(() => {
      this.error = this.translate.instant(key);
      this.loading = false;
    });
    this.cdr.detectChanges();
  }

  private async loadAll() {
    try {
      this.zone.run(() => (this.loading = true));
      const [classes, teachers] = await Promise.all([
        this.data.getClasses(this.schoolId),
        this.data.getSubjectTeachers(this.schoolId),
      ]);

      this.zone.run(() => {
        this.classes = classes ?? [];
        this.classNameById = new Map((this.classes ?? []).filter(c => c?.id).map(c => [c.id!, c.name]));
        this.subjectTeachers = teachers ?? [];
        this.loading = false;
      });
      this.cdr.detectChanges();
    } catch (e) {
      this.setError('SUBJECT_TEACHERS.ERRORS.LOAD_FAILED');
    }
  }

  private classOptions(): ClassOption[] {
    return (this.classes ?? []).filter(c => c?.id).map(c => ({ id: c.id!, name: c.name }));
  }

  async addSubjectTeacher() {
    const ref = this.dialog.open(SubjectTeacherFormDialog, {
      width: '520px',
      data: { title: this.translate.instant('SUBJECT_TEACHERS.DIALOG.ADD_TITLE'), classes: this.classOptions() },
    });

    const result = await firstValueFrom(ref.afterClosed());
    if (result) {
      this.loading = true;
      try { await this.data.createSubjectTeacher(this.schoolId, result); await this.loadAll(); }
      catch { this.setError('SUBJECT_TEACHERS.ERRORS.CREATE_FAILED'); }
    }
  }

  async editSubjectTeacher(t: SubjectTeacher) {
    const ref = this.dialog.open(SubjectTeacherFormDialog, {
      width: '520px',
      data: {
        title: this.translate.instant('SUBJECT_TEACHERS.DIALOG.EDIT_TITLE'),
        classes: this.classOptions(),
        initial: { fullName: t.fullName, email: t.email, subject: t.subject, classIds: t.classIds },
      },
    });

    const result = await firstValueFrom(ref.afterClosed());
    if (result) {
      this.loading = true;
      try { await this.data.updateSubjectTeacher(t.id!, result); await this.loadAll(); }
      catch { this.setError('SUBJECT_TEACHERS.ERRORS.UPDATE_FAILED'); }
    }
  }

  async deleteSubjectTeacher(t: SubjectTeacher) {
    if (!confirm(this.translate.instant('SUBJECT_TEACHERS.MESSAGES.DELETE_CONFIRM', { name: t.fullName }))) return;
    this.loading = true;
    try { await this.data.deleteSubjectTeacher(t.id!); await this.loadAll(); }
    catch { this.setError('SUBJECT_TEACHERS.ERRORS.DELETE_FAILED'); }
  }

  exportToCSV() {
    const headers = ['Full Name', 'Email', 'Subject', 'Assigned Classes'];
    const rows = this.subjectTeachers.map(t => [t.fullName, t.email, t.subject, this.classesLabel(t)]);
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'teachers.csv';
    link.click();
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
}