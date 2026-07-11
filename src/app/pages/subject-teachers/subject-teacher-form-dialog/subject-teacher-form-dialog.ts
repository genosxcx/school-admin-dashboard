import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

export interface ClassOption { id: string; name: string; }

export interface SubjectTeacherDialogData {
  title: string;
  classes: ClassOption[];
  initial?: { fullName?: string; email?: string; subject?: string; classIds?: string[] };
}

@Component({
  selector: 'app-subject-teacher-form-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatIconModule, TranslatePipe],
  templateUrl: './subject-teacher-form-dialog.html',
  styles: [`
    .form-container { display: flex; flex-direction: column; gap: 16px; margin-top: 8px; }
  `]
})
export class SubjectTeacherFormDialog {
  data = inject(MAT_DIALOG_DATA) as SubjectTeacherDialogData;
  private dialogRef = inject(MatDialogRef<SubjectTeacherFormDialog>);

  model = {
    fullName: this.data.initial?.fullName || '',
    email: this.data.initial?.email || '',
    subject: this.data.initial?.subject || '',
    classIds: this.data.initial?.classIds || [],
    password: ''
  };

  isEdit = !!this.data.initial;

  constructor() {
    if (!this.isEdit) {
      this.model.password = this.generateRandomPassword(8);
    }
  }

  private generateRandomPassword(length: number): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$';
    return Array.from({ length }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
  }

  copyPassword() {
    if (this.model.password) {
      navigator.clipboard.writeText(this.model.password);
    }
  }

  save() {
    if (!this.model.fullName.trim() || !this.model.email.trim()) return;
    this.dialogRef.close(this.model);
  }
}