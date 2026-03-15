import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';

import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSnackBarModule
  ],
  templateUrl: './settings.html',
  styleUrls: ['./settings.scss']
})
export class Settings {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private snackBar = inject(MatSnackBar);

  loading = false;
  error = '';

  form = this.fb.group({
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', Validators.required]
  }, { validators: this.passwordMatchValidator });

  passwordMatchValidator(g: any) {
    const p1 = g.get('newPassword')?.value;
    const p2 = g.get('confirmPassword')?.value;
    return p1 === p2 ? null : { mismatch: true };
  }

  async submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.error = '';

    try {
      const { newPassword } = this.form.value;
      await this.auth.changePassword(newPassword!);
      
      this.snackBar.open('Password updated successfully!', 'Close', { duration: 3000 });
      this.form.reset();
      
      // Reset validation states
      Object.keys(this.form.controls).forEach(key => {
        this.form.get(key)?.setErrors(null);
      });

    } catch (e: any) {
      console.error('[Settings] change password error:', e);
      
      // Firebase security check
      if (e.code === 'auth/requires-recent-login') {
        this.error = 'For security reasons, please log out and log back in before changing your password.';
      } else {
        this.error = e.message || 'Failed to update password.';
      }
    } finally {
      this.loading = false;
    }
  }
}