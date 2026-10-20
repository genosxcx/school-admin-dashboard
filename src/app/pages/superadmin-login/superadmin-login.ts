import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, FormGroup } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { NsLogo } from '../../shared/ns-logo/ns-logo';
import { LangSwitch } from '../../shared/lang-switch/lang-switch';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-superadmin-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    NsLogo,
    LangSwitch,
    TranslatePipe,
  ],
  templateUrl: './superadmin-login.html',
  styleUrls: ['./superadmin-login.scss'],
})
export class SuperadminLogin {
  loading = false;
  error = '';

  private SUPERADMIN_EMAIL = 'ayansar85@gmail.com';

  form!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router
  ) {
    // ✅ Create form here (after fb is available)
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
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

      if ((email ?? '').toLowerCase() !== this.SUPERADMIN_EMAIL.toLowerCase()) {
        throw new Error('AUTH.SUPER.ACCESS_DENIED');
      }

      await this.auth.login(email!, password!);
      await this.router.navigateByUrl('/superadmin/requests');

    } catch (e: any) {
      this.error = e?.message ?? 'AUTH.SUPER.LOGIN_FAILED';
    } finally {
      this.loading = false;
    }
  }
}