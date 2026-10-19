import { Component, Injectable, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { DataService } from '../../core/services/data.service';

export type SetPasswordDialogData = { name: string; length?: number };

@Component({
  selector: 'app-set-password-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    TranslatePipe,
  ],
  template: `
    <h2 mat-dialog-title>{{ 'PASSWORD_DIALOG.TITLE' | translate }}</h2>

    <div mat-dialog-content class="content">
      <p>{{ 'PASSWORD_DIALOG.DESC' | translate: { name: data.name } }}</p>

      <mat-form-field appearance="outline" class="full">
        <mat-label>{{ 'PASSWORD_DIALOG.NEW' | translate }}</mat-label>
        <input matInput [(ngModel)]="password" minlength="6" autocomplete="new-password" />
        <button mat-icon-button matSuffix type="button" (click)="regenerate()" [attr.aria-label]="'PASSWORD_DIALOG.GENERATE' | translate">
          <mat-icon>refresh</mat-icon>
        </button>
        <button mat-icon-button matSuffix type="button" (click)="copy()" [attr.aria-label]="'PASSWORD_DIALOG.COPY' | translate">
          <mat-icon>content_copy</mat-icon>
        </button>
        <mat-hint>{{ 'PASSWORD_DIALOG.HINT' | translate }}</mat-hint>
      </mat-form-field>
    </div>

    <div mat-dialog-actions align="end">
      <button mat-button (click)="close()">{{ 'PASSWORD_DIALOG.CANCEL' | translate }}</button>
      <button mat-flat-button color="primary" (click)="save()" [disabled]="password.length < 6">
        {{ 'PASSWORD_DIALOG.SAVE' | translate }}
      </button>
    </div>
  `,
  styles: [`
    .content { display: flex; flex-direction: column; gap: 12px; padding-top: 8px; }
    .full { width: 100%; }
  `],
})
export class SetPasswordDialog {
  data = inject(MAT_DIALOG_DATA) as SetPasswordDialogData;
  private ref = inject(MatDialogRef<SetPasswordDialog, string | null>);

  password = this.generate();

  private generate(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const length = this.data.length ?? 8;
    return Array.from({ length }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
  }

  regenerate() { this.password = this.generate(); }

  copy() {
    if (this.password) navigator.clipboard.writeText(this.password);
  }

  close() { this.ref.close(null); }

  save() {
    if (this.password.length < 6) return;
    this.ref.close(this.password);
  }
}

/** Opens SetPasswordDialog for an account and saves the result, reporting the outcome in a snackbar. */
@Injectable({ providedIn: 'root' })
export class SetPasswordFlow {
  private dialog = inject(MatDialog);
  private dataSvc = inject(DataService);
  private snackBar = inject(MatSnackBar);
  private translate = inject(TranslateService);

  async open(uid: string, name: string, length = 8): Promise<void> {
    const ref = this.dialog.open(SetPasswordDialog, { width: '440px', data: { name, length } });
    const password = await firstValueFrom(ref.afterClosed());
    if (!password) return;

    const close = this.translate.instant('PASSWORD_DIALOG.CLOSE');
    try {
      await this.dataSvc.setUserPassword(uid, password);
      this.snackBar.open(this.translate.instant('PASSWORD_DIALOG.SUCCESS', { name }), close, { duration: 4000 });
    } catch (e: any) {
      console.error('[SetPasswordFlow] setUserPassword failed:', e);
      const key =
        e?.code === 'functions/permission-denied' ? 'PASSWORD_DIALOG.ERROR_DENIED'
        : e?.code === 'functions/not-found' ? 'PASSWORD_DIALOG.ERROR_NO_ACCOUNT'
        : 'PASSWORD_DIALOG.ERROR';
      this.snackBar.open(this.translate.instant(key), close, { duration: 6000 });
    }
  }
}
