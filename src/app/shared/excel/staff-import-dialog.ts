import { ChangeDetectorRef, Component, Injectable, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { DataService } from '../../core/services/data.service';
import { generatePassword } from '../generate-password';
import { ImportClass, downloadExcel, readFirstSheet } from './excel-sheet';
import { StaffImportResult, StaffImportRow, StaffKind, parseStaffSheet } from './staff-excel';

export type StaffImportData = StaffImportResult & {
  kind: StaffKind;
  schoolId: string;
  classes: ImportClass[];
  classNameById: Map<string, string>;
  rightToLeft: boolean;
};

type Created = StaffImportRow & { password: string };
type Failed = StaffImportRow & { error: string };

/**
 * Previews teachers or subject teachers read from an Excel file, creates them with generated
 * initial passwords, and then offers an Excel download of exactly those accounts with their
 * passwords. The passwords are not stored anywhere, so that download is the only chance to keep them.
 */
@Component({
  selector: 'app-staff-import-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatFormFieldModule, MatSelectModule, MatButtonModule, MatIconModule, MatProgressBarModule, TranslatePipe],
  template: `
    <h2 mat-dialog-title>{{ (isSubject ? 'STAFF_IMPORT.TITLE_SUBJECT' : 'STAFF_IMPORT.TITLE_TEACHER') | translate }}</h2>

    <div mat-dialog-content class="content">
      @if (step === 'preview') {
        <p>{{ 'STAFF_IMPORT.PREVIEW_SUMMARY' | translate: { ready: ready.length, skipped: skipped.length } }}</p>
        @if (data.classes.length && rowsWithoutClass) {
          <mat-form-field appearance="outline" class="full">
            <mat-label>{{ 'STAFF_IMPORT.DEFAULT_CLASS' | translate: { count: rowsWithoutClass } }}</mat-label>
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
                <th>{{ 'TEACHERS.TABLE.NAME' | translate }}</th>
                <th>{{ 'TEACHERS.TABLE.EMAIL' | translate }}</th>
                @if (isSubject) { <th>{{ 'SUBJECT_TEACHERS.TABLE.SUBJECT' | translate }}</th> }
                <th>{{ (isSubject ? 'SUBJECT_TEACHERS.TABLE.CLASSES' : 'TEACHERS.TABLE.CLASS') | translate }}</th>
                <th>{{ 'STUDENT_IMPORT.STATUS' | translate }}</th>
              </tr>
            </thead>
            <tbody>
              @for (r of data.rows; track r.row) {
                <tr [class.skip]="r.skipReason">
                  <td>{{ r.row }}</td>
                  <td>{{ r.fullName || '—' }}</td>
                  <td>{{ r.email || '—' }}</td>
                  @if (isSubject) { <td>{{ r.subject || '—' }}</td> }
                  <td>{{ classLabel(r) }}</td>
                  <td>
                    @if (r.skipReason) {
                      <span class="bad">{{ r.skipReason | translate }}</span>
                    } @else if (r.warning) {
                      <span class="warn">{{ r.warning | translate: { name: r.warningName } }}</span>
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
        <p>{{ 'STAFF_IMPORT.IMPORTING' | translate: { done: progress, total: ready.length } }}</p>
        <mat-progress-bar mode="determinate" [value]="(progress / ready.length) * 100"></mat-progress-bar>
        <p class="muted">{{ 'STUDENT_IMPORT.KEEP_OPEN' | translate }}</p>
      }

      @if (step === 'done') {
        <p>{{ 'STAFF_IMPORT.DONE_SUMMARY' | translate: { created: created.length, failed: failed.length } }}</p>
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
          {{ 'STAFF_IMPORT.CONFIRM' | translate: { count: ready.length } }}
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
    .ok { color: #16a34a; }
    .warn { color: #b45309; }
    .bad { color: #dc2626; }
    .muted { color: #64748b; font-size: 13px; }
    .notice { display: flex; gap: 8px; align-items: flex-start; padding: 10px 12px; border-radius: 8px; background: #fef3c7; color: #92400e; }
    .failures { margin: 0; padding-inline-start: 18px; color: #dc2626; font-size: 13px; }
  `],
})
export class StaffImportDialog {
  data = inject(MAT_DIALOG_DATA) as StaffImportData;
  private ref = inject(MatDialogRef<StaffImportDialog, number>);
  private dataSvc = inject(DataService);
  private translate = inject(TranslateService);
  private cdr = inject(ChangeDetectorRef);

  isSubject = this.data.kind === 'subject_teacher';
  step: 'preview' | 'importing' | 'done' = 'preview';
  ready = this.data.rows.filter((r) => !r.skipReason);
  skipped = this.data.rows.filter((r) => r.skipReason);
  rowsWithoutClass = this.ready.filter((r) => !r.classIds.length && !r.classText).length;
  /** Class for rows the file gives none; starts from the class named in the file's title. */
  defaultClassId = this.data.suggestedClassId;
  progress = 0;
  created: Created[] = [];
  failed: Failed[] = [];

  private classIdsFor(r: StaffImportRow): string[] {
    if (r.classIds.length || r.classText) return r.classIds;
    return this.defaultClassId ? [this.defaultClassId] : [];
  }

  private namesOf(ids: string[]): string {
    return ids.map((id) => this.data.classNameById.get(id) ?? id).join(', ');
  }

  classLabel(r: StaffImportRow): string {
    const ids = this.classIdsFor(r);
    if (!ids.length) return r.classText || this.translate.instant('STUDENT_DIALOG.UNASSIGNED');
    return this.namesOf(ids);
  }

  async run() {
    this.step = 'importing';
    this.ref.disableClose = true;
    this.cdr.detectChanges();

    // One at a time: each person gets their own login, and Firebase limits how fast those are made.
    for (const r of this.ready) {
      const password = generatePassword(8);
      const classIds = this.classIdsFor(r);
      try {
        if (this.isSubject) {
          await this.dataSvc.createSubjectTeacher(this.data.schoolId, {
            fullName: r.fullName, email: r.email, subject: r.subject, classIds, password,
          });
        } else {
          await this.dataSvc.createTeacher(this.data.schoolId, {
            fullName: r.fullName, email: r.email, classId: classIds[0] ?? '', password,
          });
        }
        this.created.push({ ...r, classIds, password });
      } catch (e: any) {
        console.error('[StaffImport] create failed for row', r.row, e);
        const error =
          e?.code === 'auth/email-already-in-use' ? 'STAFF_IMPORT.ERROR_EMAIL_IN_USE'
          : e?.code === 'auth/invalid-email' ? 'STAFF_IMPORT.SKIP_BAD_EMAIL'
          : e?.code === 'auth/too-many-requests' ? 'STUDENT_IMPORT.ERROR_RATE_LIMIT'
          : 'STAFF_IMPORT.ERROR_CREATE';
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
    const headers = [t('TEACHERS.TABLE.NAME'), t('TEACHERS.TABLE.EMAIL')];
    if (this.isSubject) headers.push(t('SUBJECT_TEACHERS.TABLE.SUBJECT'));
    headers.push(t(this.isSubject ? 'SUBJECT_TEACHERS.TABLE.CLASSES' : 'TEACHERS.TABLE.CLASS'));
    headers.push(t('STUDENT_IMPORT.INITIAL_PASSWORD'));

    const prefix = this.isSubject ? 'subject_teachers' : 'teachers';
    await downloadExcel(
      `${prefix}_initial_passwords_${new Date().toISOString().slice(0, 10)}.xlsx`,
      t(this.isSubject ? 'SUBJECT_TEACHERS.TITLE' : 'TEACHERS.TITLE'),
      headers,
      this.created.map((p) => [
        p.fullName,
        p.email,
        ...(this.isSubject ? [p.subject] : []),
        this.namesOf(p.classIds),
        p.password,
      ]),
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

/** Excel import, export and template for the Teachers and Subject Teachers pages. */
@Injectable({ providedIn: 'root' })
export class StaffExcelFlow {
  private dialog = inject(MatDialog);
  private translate = inject(TranslateService);

  private get rightToLeft(): boolean {
    return ['ar', 'he'].includes(this.translate.getCurrentLang() ?? '');
  }

  private headers(kind: StaffKind): string[] {
    const t = (key: string) => this.translate.instant(key);
    return kind === 'subject_teacher'
      ? [t('SUBJECT_TEACHERS.TABLE.NAME'), t('SUBJECT_TEACHERS.TABLE.EMAIL'), t('SUBJECT_TEACHERS.TABLE.SUBJECT'), t('SUBJECT_TEACHERS.TABLE.CLASSES')]
      : [t('TEACHERS.TABLE.NAME'), t('TEACHERS.TABLE.EMAIL'), t('TEACHERS.TABLE.CLASS')];
  }

  private sheetName(kind: StaffKind): string {
    return this.translate.instant(kind === 'subject_teacher' ? 'SUBJECT_TEACHERS.TITLE' : 'TEACHERS.TITLE');
  }

  private fileName(kind: StaffKind, what: string): string {
    return `${kind === 'subject_teacher' ? 'subject_teachers' : 'teachers'}_${what}.xlsx`;
  }

  /** Excel of the listed people. Passwords are never stored, so they can't be included. */
  async export(kind: StaffKind, rows: (string | number)[][]): Promise<void> {
    await downloadExcel(
      this.fileName(kind, `export_${new Date().toISOString().slice(0, 10)}`),
      this.sheetName(kind), this.headers(kind), rows, this.rightToLeft,
    );
  }

  /** Empty Excel with the columns the import understands. */
  async template(kind: StaffKind, exampleClass: string): Promise<void> {
    const name = this.translate.instant('STAFF_IMPORT.TEMPLATE_EXAMPLE_NAME');
    const example = kind === 'subject_teacher'
      ? [name, 'teacher@example.com', this.translate.instant('STAFF_IMPORT.TEMPLATE_EXAMPLE_SUBJECT'), exampleClass]
      : [name, 'teacher@example.com', exampleClass];
    await downloadExcel(this.fileName(kind, 'import_template'), this.sheetName(kind), this.headers(kind), [example], this.rightToLeft);
  }

  /** Reads the chosen file and runs the import dialog; resolves to how many accounts were created. */
  async import(
    input: HTMLInputElement,
    kind: StaffKind,
    schoolId: string,
    classes: ImportClass[],
    existingEmails: string[],
  ): Promise<number> {
    const file = input.files?.[0];
    input.value = '';
    if (!file || !schoolId) return 0;

    let parsed: StaffImportResult;
    try {
      parsed = parseStaffSheet(await readFirstSheet(file), kind, classes, existingEmails);
    } catch (e) {
      console.error('[StaffExcelFlow] reading Excel failed:', e);
      alert(this.translate.instant('STUDENT_IMPORT.ERROR_READ'));
      return 0;
    }
    if (!parsed.rows.length) {
      alert(this.translate.instant('STAFF_IMPORT.ERROR_EMPTY'));
      return 0;
    }

    const ref = this.dialog.open(StaffImportDialog, {
      width: '820px',
      maxWidth: '95vw',
      data: {
        ...parsed,
        kind,
        schoolId,
        classes,
        classNameById: new Map(classes.map((c) => [c.id, c.name])),
        rightToLeft: this.rightToLeft,
      } satisfies StaffImportData,
    });
    return (await firstValueFrom(ref.afterClosed())) ?? 0;
  }
}
