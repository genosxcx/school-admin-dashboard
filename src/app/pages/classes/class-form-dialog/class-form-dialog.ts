import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

// ✅ Import TranslatePipe
import { TranslatePipe } from '@ngx-translate/core';

export type ClassFormData = {
  title: string;
  initialName?: string;
};

export type ClassFormResult = {
  name: string;
};

@Component({
  selector: 'app-class-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    TranslatePipe // ✅ Added
  ],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>

    <div mat-dialog-content class="content">
      <mat-form-field appearance="outline" class="full">
        <mat-label>{{ 'CLASS_DIALOG.LABEL' | translate }}</mat-label>
        <input matInput [(ngModel)]="name" [placeholder]="'CLASS_DIALOG.PLACEHOLDER' | translate" />
      </mat-form-field>
    </div>

    <div mat-dialog-actions align="end">
      <button mat-button (click)="close()">{{ 'CLASS_DIALOG.CANCEL' | translate }}</button>
      <button mat-flat-button color="primary" (click)="save()" [disabled]="!name.trim()">
        {{ 'CLASS_DIALOG.SAVE' | translate }}
      </button>
    </div>
  `,
  styles: [`
    .content { display: grid; gap: 12px; padding-top: 8px; }
    .full { width: 100%; }
  `]
})
export class ClassFormDialog {
  data = inject(MAT_DIALOG_DATA) as ClassFormData;
  private ref = inject(MatDialogRef<ClassFormDialog, ClassFormResult | null>);

  name = this.data.initialName ?? '';

  close() {
    this.ref.close(null);
  }

  save() {
    this.ref.close({ name: this.name.trim() });
  }
}