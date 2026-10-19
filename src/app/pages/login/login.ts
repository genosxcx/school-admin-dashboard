import { Component, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
  ],
  templateUrl: './login.html',
  styleUrls: ['./login.scss'],
})
export class Login {
  loading = false;
  error = '';
  info = '';

  form;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef // ✅ Added ChangeDetectorRef to fix the infinite spinner
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  fillTeacher() {
    this.error = '';
    this.form.patchValue({
      email: 'abd@test.com',
      password: 'FPhAwdb0',
    });
    this.form.markAsDirty();
    this.form.get('email')?.markAsTouched();
    this.form.get('password')?.markAsTouched();
  }

  fillPrincipal() {
    this.error = '';
    this.form.patchValue({
      email: 'principal2@test.com',
      password: '123123',
    });
    this.form.markAsDirty();
    this.form.get('email')?.markAsTouched();
    this.form.get('password')?.markAsTouched();
  }

  fillsubjectTeacher() {
    this.error = '';
    this.form.patchValue({
      email: 'aya@test.com',
      password: 'LG0DzW$t',
    });
    this.form.markAsDirty();
    this.form.get('email')?.markAsTouched();
    this.form.get('password')?.markAsTouched();
  }

  async forgotPassword() {
    this.error = '';
    this.info = '';

    const emailCtrl = this.form.get('email')!;
    if (emailCtrl.invalid) {
      emailCtrl.markAsTouched();
      this.error = 'Enter your email above, then click "Forgot password?" again.';
      return;
    }

    this.loading = true;
    this.cdr.detectChanges();

    try {
      await this.auth.sendPasswordReset(emailCtrl.value!);
      this.info = 'If an account exists for this email, a password reset link has been sent. Check your inbox and spam folder.';
    } catch (e: any) {
      console.error('Password reset error:', e);
      this.error =
        e?.code === 'auth/too-many-requests'
          ? 'Too many attempts. Please try again later.'
          : 'Could not send the reset email. Please try again.';
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  async submit() {
    this.error = '';
    this.info = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.cdr.detectChanges(); // ✅ Force UI to show spinner

    try {
      const { email, password } = this.form.getRawValue();
      await this.auth.login(email!, password!);
      
      console.log('Login successful, navigating to /admin...');
      await this.router.navigateByUrl('/admin');
      
    } catch (e: any) {
      console.error('Login Error:', e);
      this.error = e?.message ?? 'Login failed. Please check your credentials.';
    } finally {
      this.loading = false;
      this.cdr.detectChanges(); // ✅ Force UI to stop spinning and show error
    }
  }
}