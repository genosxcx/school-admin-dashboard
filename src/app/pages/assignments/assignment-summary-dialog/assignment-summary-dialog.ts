import { Component, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

import { Assignment } from '../../../core/services/data.service';

type AssignmentSummaryData = Assignment & { classNames?: string };

@Component({
  selector: 'app-assignment-summary-dialog',
  standalone: true,
  imports: [CommonModule, DatePipe, MatDialogModule, MatButtonModule, MatIconModule, TranslatePipe],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>

    <div mat-dialog-content class="content">
      <div class="section">
        <span class="label">{{ 'ASSIGNMENTS.TABLE.DESCRIPTION' | translate }}</span>
        <p class="description" [style.font-family]="fontStyle['font-family']" [style.font-size.px]="fontStyle['font-size.px']">
          {{ data.description || '-' }}
        </p>
      </div>

      <div class="meta-grid">
        <div class="meta-item">
          <mat-icon>event</mat-icon>
          <div>
            <span class="label">{{ 'ASSIGNMENTS.TABLE.CREATED_ON' | translate }}</span>
            <span class="value">{{ data.createdAt | date:'mediumDate' }}</span>
          </div>
        </div>

        <div class="meta-item" *ngIf="data.startTime">
          <mat-icon>play_circle_outline</mat-icon>
          <div>
            <span class="label">وقت البدء</span>
            <span class="value">{{ data.startTime | date:'medium' }}</span>
          </div>
        </div>

        <div class="meta-item" *ngIf="data.endTime">
          <mat-icon>stop_circle_outlined</mat-icon>
          <div>
            <span class="label">وقت الانتهاء</span>
            <span class="value">{{ data.endTime | date:'medium' }}</span>
          </div>
        </div>

        <div class="meta-item">
          <mat-icon>font_download</mat-icon>
          <div>
            <span class="label">الخط</span>
            <span class="value">{{ data.fontFamily || 'Naskh' }} ({{ data.fontSize || 20 }}px)</span>
          </div>
        </div>
      </div>

      <div class="section" *ngIf="data.classNames">
        <span class="label">{{ 'ASSIGNMENTS.TABLE.ASSIGNED_TO' | translate }}</span>
        <div class="pills">
          <span class="pill">{{ data.classNames }}</span>
        </div>
      </div>
    </div>

    <div mat-dialog-actions align="end">
      <button mat-flat-button color="primary" (click)="close()">
        {{ 'ASSIGNMENT_DIALOG.CANCEL' | translate }}
      </button>
    </div>
  `,
  styles: [`
    .content { display: flex; flex-direction: column; gap: 20px; padding-top: 8px; max-width: 420px; }
    .section { display: flex; flex-direction: column; gap: 6px; }
    .label { font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.4px; }
    .description { margin: 0; line-height: 1.6; color: #0f172a; white-space: pre-wrap; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .meta-item { display: flex; align-items: flex-start; gap: 8px; }
    .meta-item mat-icon { color: #4f46e5; font-size: 20px; width: 20px; height: 20px; margin-top: 2px; }
    .meta-item div { display: flex; flex-direction: column; gap: 2px; }
    .meta-item .value { font-size: 13px; font-weight: 600; color: #0f172a; }
    .pills { display: flex; flex-wrap: wrap; gap: 6px; }
    .pill { background: #eef2ff; color: #4f46e5; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; }
  `],
})
export class AssignmentSummaryDialog {
  data = inject(MAT_DIALOG_DATA) as AssignmentSummaryData;
  private ref = inject(MatDialogRef<AssignmentSummaryDialog>);

  private readonly fontMap: Record<string, string> = {
    Naskh: "'Noto Naskh Arabic', 'Traditional Arabic', serif",
    Ruqaa: "'Aref Ruqaa', serif",
    Kufi: "'Noto Kufi Arabic', sans-serif",
    Thuluth: "'Aref Ruqaa', 'Amiri', serif",
  };

  get fontStyle() {
    const key = this.data.fontFamily || 'Naskh';
    return {
      'font-family': this.fontMap[key] || this.fontMap['Naskh'],
      'font-size.px': this.data.fontSize || 20,
    };
  }

  close() {
    this.ref.close();
  }
}