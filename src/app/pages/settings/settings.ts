import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { take } from 'rxjs/operators';

import { AuthService } from '../../core/services/auth.service';
import { RoleService } from '../../core/services/role.service';
import { DataService } from '../../core/services/data.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatCardModule, MatFormFieldModule,
    MatInputModule, MatButtonModule, MatSnackBarModule, MatSelectModule, MatIconModule
  ],
  templateUrl: './settings.html',
  styleUrls: ['./settings.scss']
})
export class Settings implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  public roleSvc = inject(RoleService);
  private dataSvc = inject(DataService);
  private snackBar = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);

  // UI State
  activeSection: 'org' | 'password' | 'terms' | null = null;
  loading = false;
  error = '';
  schoolId = '';
  logoFile: File | null = null;

  form = this.fb.group({
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', Validators.required]
  }, { validators: this.passwordMatchValidator });

  orgForm = this.fb.group({
    name: ['', Validators.required],
    logoUrl: ['']
  });

  ngOnInit() {
    this.roleSvc.claims$.pipe(take(1)).subscribe(async (claims) => {
      if (!claims || !claims.schoolId) return;
      
      this.schoolId = claims.schoolId.toString();

      try {
        const school = await this.dataSvc.getSchoolDetails(this.schoolId);
        if (school) {
          this.orgForm.patchValue({
            name: (school['name'] as string) ?? '',
            logoUrl: (school['logoUrl'] as string) ?? ''
          });
        }
      } catch (e) {
        console.error('Settings: Error loading branding', e);
      }
      this.cdr.detectChanges();
    });
  }

  passwordMatchValidator(g: any) {
    return g.get('newPassword')?.value === g.get('confirmPassword')?.value ? null : { mismatch: true };
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.logoFile = file;
    }
  }

  async submitPassword() {
    if (this.form.invalid) return;
    this.loading = true;
    try {
      await this.auth.changePassword(this.form.value.newPassword!);
      this.snackBar.open('Password updated!', 'Close', { duration: 3000 });
      this.form.reset();
    } catch (e: any) {
      this.error = e.message || 'Failed to update password.';
    } finally {
      this.loading = false;
    }
  }

  async updateOrganization() {
  const currentClaims = this.roleSvc.claims;
  // Ensure we have a valid schoolId before proceeding
  const schoolId = currentClaims?.schoolId; 
  const isCurrentlyPrincipal = ['principal', 'admin'].includes((currentClaims?.role ?? '').toLowerCase());

  // Add this guard to catch the empty ID before it hits Firebase
  if (!schoolId || schoolId.trim() === '') {
    console.error('Save failed: schoolId is missing or empty.');
    this.snackBar.open('Error: School ID is missing. Please refresh.', 'Close');
    return;
  }

  if (!isCurrentlyPrincipal || this.orgForm.invalid) {
    this.snackBar.open('Unauthorized or invalid form.', 'Close');
    return;
  }
  
  this.loading = true;
  try {
    let logoUrl = this.orgForm.value.logoUrl;

    if (this.logoFile) {
      logoUrl = await this.dataSvc.uploadLogo(schoolId, this.logoFile);
    }

    // Now it is safe to call, because we verified schoolId exists
    await this.dataSvc.updateSchoolDetails(schoolId, {
      name: this.orgForm.value.name!,
      logoUrl: logoUrl!
    });
    
    this.snackBar.open('Organization details saved!', 'Close', { duration: 3000 });
    this.logoFile = null; 
    this.cdr.detectChanges(); 
  } catch (e) {
    console.error(e);
    this.snackBar.open('Failed to save branding.', 'Close', { duration: 3000 });
  } finally {
    this.loading = false;
  }
}

  viewTerms() { 
    this.activeSection = 'terms';
  }
}