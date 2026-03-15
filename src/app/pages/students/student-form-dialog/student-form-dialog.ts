 import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon'; // ✅ Added for copy icon

export type ClassOption = { id: string; name: string };

export type StudentFormData = {
  title: string;
  classes: ClassOption[]; 
  initial?: { fullName: string; email?: string; classId?: string };
  lockClass?: boolean; // ✅ Added so we can hide the dropdown for Home Teachers
};

export type StudentFormResult = {
  fullName: string;
  email?: string;
  classId?: string; 
  password?: string; // ✅ Return password
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
    MatIconModule
  ],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>

    <div mat-dialog-content class="content">
      <mat-form-field appearance="outline" class="full">
        <mat-label>Full name</mat-label>
        <input matInput [(ngModel)]="fullName" />
      </mat-form-field>

      <mat-form-field appearance="outline" class="full">
        <mat-label>Email (Required for login)</mat-label>
        <input matInput [(ngModel)]="email" type="email" />
      </mat-form-field>

      <mat-form-field appearance="outline" class="full" *ngIf="password">
        <mat-label>Generated Password (Copy this!)</mat-label>
        <input matInput [value]="password" readonly />
        <mat-icon matSuffix>content_copy</mat-icon>
        <mat-hint>Give this to the student so they can log in.</mat-hint>
      </mat-form-field>

      <mat-form-field appearance="outline" class="full" *ngIf="!data.lockClass">
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
      <button mat-flat-button color="primary" (click)="save()" [disabled]="!fullName.trim() || !email.trim()">
        Save
      </button>
    </div>
  `,
  styles: [`
    .content { display: flex; flex-direction: column; gap: 12px; padding-top: 8px; }
    .full { width: 100%; }
  `],
})
export class StudentFormDialog {
  data = inject(MAT_DIALOG_DATA) as StudentFormData;
  private ref = inject(MatDialogRef<StudentFormDialog, StudentFormResult | null>);

  fullName = this.data.initial?.fullName ?? '';
  email = this.data.initial?.email ?? '';
  classId = this.data.initial?.classId ?? '';

  password = this.data.initial ? '' : this.generateRandomPassword(6);

  private generateRandomPassword(length: number): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let pass = '';
    for (let i = 0; i < length; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  }

  close() {
    this.ref.close(null);
  }

  save() {
    this.ref.close({
      fullName: this.fullName.trim(),
      email: this.email.trim(),
      classId: (this.classId ?? '').toString(),
      password: this.password
    });
  }
}