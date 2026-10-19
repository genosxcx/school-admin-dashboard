import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { DataService } from '../../../core/services/data.service';
import { generatePassword } from '../../../shared/generate-password';
import { ImportClass, ImportResult, ImportRow, downloadExcel } from '../student-excel';

export type StudentImportData = ImportResult & {
  schoolId: string;
  /** Classes to choose from for students the file gives no class; empty for teachers. */
  classes: ImportClass[];
  classNameById: Map<string, string>;
  rightToLeft: boolean;
};

type CreatedStudent = ImportRow & { loginEmail: string; password: string };
type FailedStudent = ImportRow & { error: string };

/**
 * Previews the students read from an Excel file, creates them with generated initial passwords,
 * and then offers an Excel download of exactly those students with their passwords. The
 * passwords are not stored anywhere, so that download is the only chance to keep them.
 */
@Component({
  selector: 'app-student-import-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatFormFieldModule, MatSelectModule, MatButtonModule, MatIconModule, MatProgressBarModule, TranslatePipe],
  template: `
    <h2 mat-dialog-title>{{ 'STUDENT_IMPORT.TITLE' | translate }}</h2>

    <div mat-dialog-content class="content">
      @if (step === 'preview') {
        <p>
          {{ 'STUDENT_IMPORT.PREVIEW_SUMMARY' | translate: { ready: ready.length, skipped: skipped.length } }}
        </p>
        @if (data.classes.length && rowsWithoutClass) {
          <mat-form-field appearance="outline" class="full">
            <mat-label>{{ 'STUDENT_IMPORT.DEFAULT_CLASS' | translate: { count: rowsWithoutClass } }}</mat-label>
            <mat-select [(ngModel)]="defaultClassId">
              <mat-option [value]="''">{{ 'STUDENT_DIALOG.UNASSIGNED' | translate }}</mat-option>
              @for (c of data.classes; track c.id) {
                <mat-option [value]="c.id">{{ c.name }}</mat-option>
              }
            </mat-select>
            @if (data.title) {
              <mat-hint>{{ 'STUDENT_IMPORT.FILE_TITLE' | translate: { title: data.title } }}</mat-hint>
            }
          </mat-form-field>
        }
        <div class="table-wrap">
          <table class="rows">
            <thead>
              <tr>
                <th>#</th>
                <th>{{ 'STUDENTS.TABLE.ID' | translate }}</th>
                <th>{{ 'STUDENTS.TABLE.NAME' | translate }}</th>
                <th>{{ 'STUDENTS.TABLE.CLASS' | translate }}</th>
                <th>{{ 'STUDENT_IMPORT.STATUS' | translate }}</th>
              </tr>
            </thead>
            <tbody>
              @for (r of data.rows; track r.row) {
                <tr [class.skip]="r.skipReason">
                  <td>{{ r.row }}</td>
                  <td>
                    {{ r.studentId || '—' }}
                    @if (r.generatedId) { <span class="tag">{{ 'STUDENT_IMPORT.GENERATED' | translate }}</span> }
                  </td>
                  <td>{{ r.fullName || '—' }}</td>
                  <td>{{ classLabel(r) }}</td>
                  <td>
                    @if (r.skipReason) {
                      <span class="bad">{{ r.skipReason | translate }}</span>
                    } @else if (r.warning) {
                      <span class="warn">{{ r.warning | translate: { name: r.classText } }}</span>
                    } @else {
                      <span class="ok">{{ 'STUDENT_IMPORT.READY' | translate }}</span>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      @if (step === 'importing') {
        <p>{{ 'STUDENT_IMPORT.IMPORTING' | translate: { done: progress, total: ready.length } }}</p>
        <mat-progress-bar mode="determinate" [value]="(progress / ready.length) * 100"></mat-progress-bar>
        <p class="muted">{{ 'STUDENT_IMPORT.KEEP_OPEN' | translate }}</p>
      }

      @if (step === 'done') {
        <p>{{ 'STUDENT_IMPORT.DONE_SUMMARY' | translate: { created: created.length, failed: failed.length } }}</p>
        @if (created.length) {
          <p class="notice">
            <mat-icon>warning_amber</mat-icon>
            <span>{{ 'STUDENT_IMPORT.PASSWORDS_ONCE' | translate }}</span>
          </p>
        }
        @if (failed.length) {
          <ul class="failures">
            @for (f of failed; track f.row) {
              <li>{{ 'STUDENT_IMPORT.ROW' | translate: { row: f.row } }} · {{ f.fullName }}: {{ f.error | translate }}</li>
            }
          </ul>
        }
      }
    </div>

    <div mat-dialog-actions align="end">
      @if (step === 'preview') {
        <button mat-button (click)="close()">{{ 'STUDENT_DIALOG.CANCEL' | translate }}</button>
        <button mat-flat-button color="primary" (click)="run()" [disabled]="!ready.length">
          {{ 'STUDENT_IMPORT.CONFIRM' | translate: { count: ready.length } }}
        </button>
      }
      @if (step === 'done') {
        @if (created.length) {
          <button mat-flat-button color="primary" (click)="downloadPasswords()">
            <mat-icon>download</mat-icon>
            {{ 'STUDENT_IMPORT.DOWNLOAD_PASSWORDS' | translate }}
          </button>
        }
        <button mat-button (click)="close()">{{ 'PASSWORD_DIALOG.CLOSE' | translate }}</button>
      }
    </div>
  `,
  styles: [`
    .content { display: flex; flex-direction: column; gap: 12px; padding-top: 8px; }
    .full { width: 100%; }
    .table-wrap { max-height: 50vh; overflow: auto; border: 1px solid rgba(15, 23, 42, 0.08); border-radius: 8px; }
    table.rows { width: 100%; border-collapse: collapse; font-size: 13px; }
    table.rows th, table.rows td { padding: 6px 10px; text-align: start; border-bottom: 1px solid rgba(15, 23, 42, 0.06); }
    table.rows th { position: sticky; top: 0; background: #f8fafc; font-weight: 600; }
    tr.skip td { color: #94a3b8; }
    .tag { margin-inline-start: 6px; font-size: 11px; padding: 1px 6px; border-radius: 6px; background: #eef2ff; color: #4f46e5; }
    .ok { color: #16a34a; }
    .warn { color: #b45309; }
    .bad { color: #dc2626; }
    .muted { color: #64748b; font-size: 13px; }
    .notice { display: flex; gap: 8px; align-items: flex-start; padding: 10px 12px; border-radius: 8px; background: #fef3c7; color: #92400e; }
    .failures { margin: 0; padding-inline-start: 18px; color: #dc2626; font-size: 13px; }
  `],
})
export class StudentImportDialog {
  data = inject(MAT_DIALOG_DATA) as StudentImportData;
  private ref = inject(MatDialogRef<StudentImportDialog, number>);
  private dataSvc = inject(DataService);
  private translate = inject(TranslateService);
  private cdr = inject(ChangeDetectorRef);

  step: 'preview' | 'importing' | 'done' = 'preview';
  ready = this.data.rows.filter((r) => !r.skipReason);
  skipped = this.data.rows.filter((r) => r.skipReason);
  rowsWithoutClass = this.ready.filter((r) => !r.classId && !r.classText).length;
  /** Class for students the file gives none; starts from the class named in the file's title. */
  defaultClassId = this.data.suggestedClassId;
  progress = 0;
  created: CreatedStudent[] = [];
  failed: FailedStudent[] = [];

  private classIdFor(r: ImportRow): string {
    return r.classId || (r.classText ? '' : this.defaultClassId);
  }

  classLabel(r: ImportRow): string {
    const classId = this.classIdFor(r);
    if (classId) return this.data.classNameById.get(classId) ?? classId;
    return r.classText || this.translate.instant('STUDENT_DIALOG.UNASSIGNED');
  }

  async run() {
    this.step = 'importing';
    this.ref.disableClose = true;
    this.cdr.detectChanges();

    // One at a time: each student gets its own login, and Firebase limits how fast those are made.
    for (const r of this.ready) {
      const password = generatePassword(6);
      try {
        const { loginEmail } = await this.dataSvc.createStudent(this.data.schoolId, {
          studentId: r.studentId,
          fullName: r.fullName,
          email: r.email || undefined,
          classId: this.classIdFor(r),
          password,
        });
        this.created.push({ ...r, classId: this.classIdFor(r), loginEmail, password });
      } catch (e: any) {
        console.error('[StudentImport] createStudent failed for row', r.row, e);
        const error =
          e?.code === 'auth/too-many-requests' ? 'STUDENT_IMPORT.ERROR_RATE_LIMIT'
          : e?.code === 'auth/invalid-email' ? 'STUDENT_IMPORT.SKIP_BAD_ID'
          : 'STUDENTS.MESSAGES.ERROR_CREATE';
        this.failed.push({ ...r, error });
      }
      this.progress++;
      this.cdr.detectChanges();
    }

    this.step = 'done';
    this.ref.disableClose = this.created.length > 0;
    this.cdr.detectChanges();
  }

  async downloadPasswords() {
    const t = (key: string) => this.translate.instant(key);
    await downloadExcel(
      `students_initial_passwords_${new Date().toISOString().slice(0, 10)}.xlsx`,
      t('STUDENTS.TITLE'),
      [
        t('STUDENTS.TABLE.ID'),
        t('STUDENTS.TABLE.NAME'),
        t('STUDENTS.TABLE.CLASS'),
        t('STUDENTS.TABLE.EMAIL'),
        t('STUDENT_IMPORT.INITIAL_PASSWORD'),
      ],
      this.created.map((s) => [s.studentId, s.fullName, this.classLabel(s), s.loginEmail, s.password]),
      this.data.rightToLeft,
    );
    this.ref.disableClose = false;
  }

  close() {
    if (this.step === 'done' && this.created.length && this.ref.disableClose) {
      if (!confirm(this.translate.instant('STUDENT_IMPORT.CLOSE_WITHOUT_DOWNLOAD'))) return;
    }
    this.ref.close(this.created.length);
  }
}
