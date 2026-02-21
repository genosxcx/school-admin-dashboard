import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';

export type ClassOption = { id: string; name: string };

export type StudentFormData = {
  title: string;
  classes: ClassOption[]; // ✅ dropdown options
  initial?: { fullName: string; email?: string; classId?: string };
};

export type StudentFormResult = {
  fullName: string;
  email?: string;
  classId?: string; // class doc id
};

@Component({
  selector: 'app-student-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>

    <div mat-dialog-content class="content">
      <mat-form-field appearance="outline" class="full">
        <mat-label>Full name</mat-label>
        <input matInput [(ngModel)]="fullName" />
      </mat-form-field>

      <mat-form-field appearance="outline" class="full">
        <mat-label>Email (optional)</mat-label>
        <input matInput [(ngModel)]="email" />
      </mat-form-field>

      <mat-form-field appearance="outline" class="full">
        <mat-label>Class</mat-label>
        <mat-select [(ngModel)]="classId">
          <mat-option [value]="''">Unassigned</mat-option>
          <mat-option *ngFor="let c of data.classes" [value]="c.id">
            {{ c.name }}
          </mat-option>
        </mat-select>
      </mat-form-field>
    </div>

    <div mat-dialog-actions align="end">
      <button mat-button (click)="close()">Cancel</button>
      <button mat-flat-button color="primary" (click)="save()" [disabled]="!fullName.trim()">
        Save
      </button>
    </div>
  `,
  styles: [`
    .content { display: grid; gap: 12px; padding-top: 8px; }
    .full { width: 100%; }
  `],
})
export class StudentFormDialog{
  data = inject(MAT_DIALOG_DATA) as StudentFormData;
  private ref = inject(MatDialogRef<StudentFormDialog, StudentFormResult | null>);

  fullName = this.data.initial?.fullName ?? '';
  email = this.data.initial?.email ?? '';
  classId = this.data.initial?.classId ?? '';

  close() {
    this.ref.close(null);
  }

  save() {
    this.ref.close({
      fullName: this.fullName.trim(),
      email: this.email.trim(),
      classId: (this.classId ?? '').toString(),
    });
  }
}
