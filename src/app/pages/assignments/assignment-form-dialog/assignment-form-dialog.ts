import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';

// ✅ Import TranslatePipe
import { TranslatePipe } from '@ngx-translate/core';

export type ClassOption = { id: string; name: string };
export type AssignmentFormData = { title: string; classes: ClassOption[] };
export type AssignmentFormResult = {
  title: string;
  description: string;
  classIds: string[];
  startTime: string | null;
  endTime: string | null;
};

@Component({
  selector: 'app-assignment-form-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatDialogModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatButtonModule, TranslatePipe // ✅ Added Pipe
  ],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>

    <div mat-dialog-content class="content">
      <mat-form-field appearance="outline" class="full">
        <mat-label>{{ 'ASSIGNMENT_DIALOG.TITLE_FIELD' | translate }}</mat-label>
        <input matInput [(ngModel)]="title" [placeholder]="'ASSIGNMENT_DIALOG.TITLE_PLACEHOLDER' | translate" required />
      </mat-form-field>

      <mat-form-field appearance="outline" class="full">
        <mat-label>{{ 'ASSIGNMENT_DIALOG.DESC_FIELD' | translate }}</mat-label>
        <textarea matInput [(ngModel)]="description" rows="4" [placeholder]="'ASSIGNMENT_DIALOG.DESC_PLACEHOLDER' | translate"></textarea>
      </mat-form-field>

      <mat-form-field appearance="outline" class="full">
        <mat-label>{{ 'ASSIGNMENT_DIALOG.CLASSES_FIELD' | translate }}</mat-label>
        <mat-select [(ngModel)]="classIds" multiple required>
          <mat-option *ngFor="let c of data.classes" [value]="c.id">
            {{ c.name }}
          </mat-option>
        </mat-select>
      </mat-form-field>

      <div class="time-row">
        <mat-form-field appearance="outline" class="half">
          <mat-label>{{ 'ASSIGNMENT_DIALOG.START_TIME' | translate }}</mat-label>
          <input matInput type="datetime-local" [(ngModel)]="startTime" />
        </mat-form-field>

        <mat-form-field appearance="outline" class="half">
          <mat-label>{{ 'ASSIGNMENT_DIALOG.END_TIME' | translate }}</mat-label>
          <input matInput type="datetime-local" [(ngModel)]="endTime" />
        </mat-form-field>
      </div>
    </div>

    <div mat-dialog-actions align="end">
      <button mat-button (click)="close()">{{ 'ASSIGNMENT_DIALOG.CANCEL' | translate }}</button>
      <button mat-flat-button color="primary" (click)="save()" [disabled]="!title.trim() || classIds.length === 0">
        {{ 'ASSIGNMENT_DIALOG.SAVE' | translate }}
      </button>
    </div>
  `,
  styles: [`
    .content { display: flex; flex-direction: column; gap: 12px; padding-top: 8px; }
    .full { width: 100%; }
    .time-row { display: flex; gap: 16px; width: 100%; }
    .half { flex: 1; } 
  `],
})
export class AssignmentFormDialog {
  data = inject(MAT_DIALOG_DATA) as AssignmentFormData;
  private ref = inject(MatDialogRef<AssignmentFormDialog, AssignmentFormResult | null>);

  title = '';
  description = '';
  classIds: string[] = [];
  startTime = '';
  endTime = '';

  close() { this.ref.close(null); }

  save() {
    this.ref.close({
      title: this.title.trim(),
      description: this.description.trim(),
      classIds: this.classIds,
      startTime: this.startTime || null, 
      endTime: this.endTime || null,     
    });
  }
}