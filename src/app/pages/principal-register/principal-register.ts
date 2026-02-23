import { Component } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  FormGroup,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '../../firebase';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SuperadminService } from '../../core/services/superadmin.service';

@Component({
  selector: 'app-principal-register',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './principal-register.html',
  styleUrls: ['./principal-register.scss'],
})
export class PrincipalRegister {
  loading = false;
  error = '';
  showPassword = false;
  showConfirmPassword = false;
  form!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private svc: SuperadminService,
    private router: Router
  ) {
    this.initializeForm();
  }

  /**
   * Initialize reactive form with validation
   */
  private initializeForm(): void {
    this.form = this.fb.group(
      {
        fullName: [
          '',
          [
            Validators.required,
            Validators.minLength(2),
            Validators.maxLength(100),
          ],
        ],
        email: ['', [Validators.required, Validators.email]],
        schoolName: [
          '',
          [
            Validators.required,
            Validators.minLength(2),
            Validators.maxLength(150),
          ],
        ],
        password: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', [Validators.required]],
      },
      {
        validators: this.passwordMatchValidator.bind(this),
      }
    );
  }

  /**
   * Custom validator to check if passwords match
   */
  private passwordMatchValidator(
    group: AbstractControl
  ): ValidationErrors | null {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;

    if (password && confirmPassword && password !== confirmPassword) {
      group.get('confirmPassword')?.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    } else if (confirmPassword) {
      const currentErrors = group.get('confirmPassword')?.errors;
      if (currentErrors) {
        delete currentErrors['passwordMismatch'];
        if (Object.keys(currentErrors).length === 0) {
          group.get('confirmPassword')?.setErrors(null);
        }
      }
    }

    return null;
  }

  /**
   * Check if passwords match
   */
  private passwordsMatch(): boolean {
    const password = this.form.get('password')?.value;
    const confirmPassword = this.form.get('confirmPassword')?.value;
    return password && confirmPassword && password === confirmPassword;
  }

  /**
   * Toggle password visibility
   */
  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  /**
   * Toggle confirm password visibility
   */
  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  /**
   * Get password error message
   */
  getPasswordErrorMessage(): string {
    const control = this.form.get('password');
    if (control?.hasError('required')) {
      return 'Password is required';
    }
    if (control?.hasError('minlength')) {
      return 'Password must be at least 6 characters';
    }
    return '';
  }

  /**
   * Get confirm password error message
   */
  getConfirmPasswordErrorMessage(): string {
    const control = this.form.get('confirmPassword');
    if (control?.hasError('required')) {
      return 'Please confirm your password';
    }
    if (control?.hasError('passwordMismatch')) {
      return 'Passwords do not match';
    }
    return '';
  }

  /**
   * Mark all form fields as touched
   */
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach((key) => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  /**
   * Submit principal registration request
   */
  async submit(): Promise<void> {
    this.error = '';

    // Validate form
    if (this.form.invalid) {
      this.markFormGroupTouched(this.form);
      return;
    }

    // Check password match
    if (!this.passwordsMatch()) {
      this.error = 'Passwords do not match';
      return;
    }

    this.loading = true;

    try {
      const { fullName, email, schoolName, password } =
        this.form.getRawValue();

      // ✅ 1) Create Firebase Auth user (password stored securely by Firebase Auth)
      const cred = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );
      const uid = cred.user.uid;

      // ✅ 2) Create principal request in database (NO password stored)
      await this.svc.submitPrincipalRequest({
        uid,
        fullName: fullName.trim(),
        email: email.trim(),
        schoolName: schoolName.trim(),
      });

      // ✅ 3) Sign out so they don't stay logged in while pending approval
      await signOut(auth);

      // ✅ 4) Navigate to success page
      await this.router.navigateByUrl('/admin/register/sent');
    } catch (error: any) {
      // Handle specific Firebase errors
      const errorCode = error?.code;
      const errorMessage = error?.message;

      if (errorCode === 'auth/email-already-in-use') {
        this.error = 'This email is already registered. Please try another.';
      } else if (errorCode === 'auth/invalid-email') {
        this.error = 'Invalid email address. Please check and try again.';
      } else if (errorCode === 'auth/weak-password') {
        this.error = 'Password is too weak. Please use a stronger password.';
      } else if (errorCode === 'auth/operation-not-allowed') {
        this.error =
          'Registration is currently disabled. Please contact support.';
      } else if (errorMessage) {
        this.error = errorMessage;
      } else {
        this.error =
          'Failed to submit registration request. Please try again.';
      }

      console.error('Registration error:', error);
    } finally {
      this.loading = false;
    }
  }
}