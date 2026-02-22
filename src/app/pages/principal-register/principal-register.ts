import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, FormGroup } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '../../firebase';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

import { SuperadminService } from '../../core/services/superadmin.service';

@Component({
  selector: 'app-principal-register',
  standalone: true,
  imports: [
    RouterModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
  ],
  templateUrl: './principal-register.html',
  styleUrls: ['./principal-register.scss'],
})
export class PrincipalRegister {
  loading = false;
  error = '';
  form!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private svc: SuperadminService,
    private router: Router
  ) {
    this.form = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      schoolName: ['', [Validators.required, Validators.minLength(2)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
    });
  }

  private passwordsMatch(): boolean {
    const p = this.form.get('password')?.value;
    const c = this.form.get('confirmPassword')?.value;
    return p && c && p === c;
  }

  async submit() {
    this.error = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (!this.passwordsMatch()) {
      this.error = 'Passwords do not match';
      return;
    }

    this.loading = true;
    try {
      const { fullName, email, schoolName, password } = this.form.getRawValue();

      // ✅ 1) Create Firebase Auth user (password is stored securely by Firebase Auth)
      const cred = await createUserWithEmailAndPassword(auth, email!, password!);
      const uid = cred.user.uid;

      // ✅ 2) Create principal request (NO password stored)
      await this.svc.submitPrincipalRequest({
        uid,
        fullName,
        email,
        schoolName,
      });

      // Optional: sign out so they don’t stay logged in while pending
      await signOut(auth);

      // ✅ 3) Success page
      await this.router.navigateByUrl('/admin/register/sent');
    } catch (e: any) {
      // common: email already in use
      this.error = e?.message ?? 'Failed to submit request';
    } finally {
      this.loading = false;
    }
  }
}