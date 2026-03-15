import { Component } from '@angular/core';
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

  form;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router
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
  async submit() {
    this.error = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    try {
      const { email, password } = this.form.getRawValue();
      await this.auth.login(email!, password!);
      await this.router.navigateByUrl('/admin');
    } catch (e: any) {
      this.error = e?.message ?? 'Login failed';
    } finally {
      this.loading = false;
    }
  }
}