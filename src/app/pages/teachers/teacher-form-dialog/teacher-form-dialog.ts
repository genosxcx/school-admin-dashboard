import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core'; // ✅ Added

export type ClassOption = { id: string; name: string };

export type TeacherFormData = {
  title: string;
  classes: ClassOption[];
  initial?: { fullName: string; email?: string; classId?: string };
};

export type TeacherFormResult = {
  fullName: string;
  email?: string;
  classId?: string;
  password?: string;
};

@Component({
  selector: 'app-teacher-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    TranslatePipe // ✅ Added
  ],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>

    <div mat-dialog-content class="content">
      <mat-form-field appearance="outline" class="full">
        <mat-label>{{ 'TEACHERS.DIALOG.NAME' | translate }}</mat-label>
        <input matInput [(ngModel)]="fullName" />
      </mat-form-field>

      <mat-form-field appearance="outline" class="full">
        <mat-label>{{ 'TEACHERS.DIALOG.EMAIL' | translate }}</mat-label>
        <input matInput [(ngModel)]="email" type="email" />
      </mat-form-field>

      <mat-form-field appearance="outline" class="full" *ngIf="password">
        <mat-label>{{ 'TEACHERS.DIALOG.PASSWORD' | translate }}</mat-label>
        <input matInput [value]="password" readonly />
        <mat-icon matSuffix>content_copy</mat-icon>
        <mat-hint>{{ 'TEACHERS.DIALOG.COPY_HINT' | translate }}</mat-hint>
      </mat-form-field>

      <mat-form-field appearance="outline" class="full">
        <mat-label>{{ 'TEACHERS.TABLE.CLASS' | translate }}</mat-label>
        <mat-select [(ngModel)]="classId">
          <mat-option [value]="''">{{ 'TEACHERS.UNASSIGNED' | translate }}</mat-option>
          <mat-option *ngFor="let c of data.classes" [value]="c.id">
            {{ c.name }}
          </mat-option>
        </mat-select>
      </mat-form-field>
    </div>

    <div mat-dialog-actions align="end">
      <button mat-button (click)="close()">{{ 'TEACHERS.DIALOG.CANCEL' | translate }}</button>
      <button mat-flat-button color="primary" (click)="save()" [disabled]="!fullName.trim() || !email.trim()">
        {{ 'TEACHERS.DIALOG.SAVE' | translate }}
      </button>
    </div>
  `,
  styles: [`
    .content { display: grid; gap: 12px; padding-top: 8px; }
    .full { width: 100%; }
  `],
})
export class TeacherFormDialog {
  data = inject(MAT_DIALOG_DATA) as TeacherFormData;
  private ref = inject(MatDialogRef<TeacherFormDialog, TeacherFormResult | null>);

  fullName = this.data.initial?.fullName ?? '';
  email = this.data.initial?.email ?? '';
  classId = this.data.initial?.classId ?? '';
  
  password = this.data.initial ? '' : this.generateRandomPassword(8);

  private generateRandomPassword(length: number): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$';
    let pass = '';
    for (let i = 0; i < length; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  }

  close() { this.ref.close(null); }

  save() {
    this.ref.close({
      fullName: this.fullName.trim(),
      email: this.email.trim(),
      classId: (this.classId ?? '').toString(),
      password: this.password
    });
  }
}