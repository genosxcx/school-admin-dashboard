import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon'; // Added for the copy icon

export interface ClassOption {
  id: string;
  name: string;
}

export interface SubjectTeacherDialogData {
  title: string;
  classes: ClassOption[];
  initial?: {
    fullName?: string;
    email?: string;
    subject?: string;
    classIds?: string[];
  };
}

@Component({
  selector: 'app-subject-teacher-form-dialog',
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
  templateUrl: './subject-teacher-form-dialog.html',
  styles: [`
    .form-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-top: 8px;
    }
  `]
})
export class SubjectTeacherFormDialog {
  model = {
    fullName: '',
    email: '',
    subject: '',
    classIds: [] as string[],
    password: '' // Added password field
  };

  constructor(
    public dialogRef: MatDialogRef<SubjectTeacherFormDialog>,
    @Inject(MAT_DIALOG_DATA) public data: SubjectTeacherDialogData
  ) {
    if (data.initial) {
      this.model.fullName = data.initial.fullName || '';
      this.model.email = data.initial.email || '';
      this.model.subject = data.initial.subject || '';
      this.model.classIds = data.initial.classIds || [];
    } else {
      // Create mode: Generate a random password automatically
      this.model.password = this.generateRandomPassword(8);
    }
  }

  private generateRandomPassword(length: number): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$';
    let pass = '';
    for (let i = 0; i < length; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  }

  save() {
    // Prevent saving if the name or email is empty (Firebase Auth requires an email)
    if (!this.model.fullName.trim() || !this.model.email.trim()) return; 
    this.dialogRef.close(this.model);
  }
}