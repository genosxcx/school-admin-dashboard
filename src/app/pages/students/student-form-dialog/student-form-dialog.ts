import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon'; 

export type ClassOption = { id: string; name: string };

export type StudentFormData = {
  title: string;
  classes: ClassOption[]; 
  initial?: { studentId?: string; fullName?: string; email?: string; classId?: string };
  lockClass?: boolean; 
};

export type StudentFormResult = {
  studentId: string; 
  fullName: string;
  email?: string;    
  classId?: string; 
  password?: string; 
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
        <mat-label>Student ID</mat-label>
        <input matInput [(ngModel)]="studentId" required />
      </mat-form-field>

      <mat-form-field appearance="outline" class="full">
        <mat-label>Full name</mat-label>
        <input matInput [(ngModel)]="fullName" required />
      </mat-form-field>

      <mat-form-field appearance="outline" class="full">
        <mat-label>Email (Optional)</mat-label>
        <input matInput [(ngModel)]="email" type="email" />
      </mat-form-field>

      <mat-form-field appearance="outline" class="full" *ngIf="password">
        <mat-label>Generated Password (Copy this!)</mat-label>
        <input matInput [value]="password" readonly />
        <mat-icon matSuffix style="cursor: pointer;" (click)="copyPassword()">content_copy</mat-icon>
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
      <button mat-flat-button color="primary" (click)="save()" [disabled]="!studentId.trim() || !fullName.trim()">
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

  // ✅ 1. Determine if this is an Edit by checking if a studentId already exists
  isEdit = !!this.data.initial?.studentId;

  studentId = this.data.initial?.studentId ?? '';
  fullName = this.data.initial?.fullName ?? '';
  email = this.data.initial?.email ?? '';
  classId = this.data.initial?.classId ?? '';

  // ✅ 2. Generate password ONLY if it is a brand-new student
  password = this.isEdit ? '' : this.generateRandomPassword(6);

  private generateRandomPassword(length: number): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let pass = '';
    for (let i = 0; i < length; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  }

  copyPassword() {
    if (this.password) {
      navigator.clipboard.writeText(this.password);
    }
  }

  close() {
    this.ref.close(null);
  }

  save() {
    this.ref.close({
      studentId: this.studentId.trim(),
      fullName: this.fullName.trim(),
      email: this.email.trim() || undefined,
      classId: (this.classId ?? '').toString(),
      password: this.password
    });
  }
}