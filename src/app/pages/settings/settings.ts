import { Component, inject, OnInit, ChangeDetectorRef, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { take } from 'rxjs/operators';

// Services
import { AuthService } from '../../core/services/auth.service';
import { RoleService } from '../../core/services/role.service';
import { DataService } from '../../core/services/data.service';

// ✅ Translate Service AND Pipe
import { TranslateService, TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatCardModule, MatFormFieldModule,
    MatInputModule, MatButtonModule, MatSnackBarModule, MatSelectModule, MatIconModule,
    TranslatePipe // ✅ Added here so the HTML pipe works!
  ],
  templateUrl: './settings.html',
  styleUrls: ['./settings.scss']
})
export class Settings implements OnInit {
  // Dependencies
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  public roleSvc = inject(RoleService);
  private dataSvc = inject(DataService);
  private snackBar = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);
  private translate = inject(TranslateService);
  private platformId = inject(PLATFORM_ID);

  // UI State
  activeSection: 'org' | 'password' | 'terms' | 'language' | null = null;
  loading = false;
  error = '';
  schoolId = '';
  logoFile: File | null = null;
  currentLang = 'en';

  // Forms
  form = this.fb.group({
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', Validators.required]
  }, { validators: this.passwordMatchValidator });

  orgForm = this.fb.group({
    name: ['', Validators.required],
    logoUrl: ['']
  });

  ngOnInit() {
    // Load saved language safely for SSR
    if (isPlatformBrowser(this.platformId)) {
      const savedLang = localStorage.getItem('appLang');
      if (savedLang) {
        this.currentLang = savedLang;
      }
    }

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

  changeLanguage(lang: string) {
    this.currentLang = lang;
    this.translate.use(lang);
    
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('appLang', lang);
    }

    // Handle RTL
    const dir = (lang === 'ar' || lang === 'he') ? 'rtl' : 'ltr';
    document.documentElement.dir = dir;
    document.documentElement.lang = lang;

    this.snackBar.open(
      this.translate.instant('SETTINGS.MESSAGES.LANG_UPDATED'), 
      this.translate.instant('SETTINGS.MESSAGES.CLOSE'), 
      { duration: 3000 }
    );
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
      this.snackBar.open(
        this.translate.instant('SETTINGS.MESSAGES.PASS_UPDATED'), 
        this.translate.instant('SETTINGS.MESSAGES.CLOSE'), 
        { duration: 3000 }
      );
      this.form.reset();
    } catch (e: any) {
      this.error = this.translate.instant('SETTINGS.MESSAGES.PASS_FAILED');
    } finally {
      this.loading = false;
    }
  }

  async updateOrganization() {
    const currentClaims = this.roleSvc.claims;
    const schoolId = currentClaims?.schoolId; 
    const isCurrentlyPrincipal = ['principal', 'admin'].includes((currentClaims?.role ?? '').toLowerCase());

    if (!schoolId || schoolId.trim() === '') {
      this.snackBar.open(this.translate.instant('SETTINGS.MESSAGES.SCHOOL_ID_MISSING'), 'Close');
      return;
    }

    if (!isCurrentlyPrincipal || this.orgForm.invalid) {
      this.snackBar.open(this.translate.instant('SETTINGS.MESSAGES.UNAUTHORIZED'), 'Close');
      return;
    }
    
    this.loading = true;
    try {
      let logoUrl = this.orgForm.value.logoUrl;

      if (this.logoFile) {
        logoUrl = await this.dataSvc.uploadLogo(schoolId, this.logoFile);
      }

      await this.dataSvc.updateSchoolDetails(schoolId, {
        name: this.orgForm.value.name!,
        logoUrl: logoUrl!
      });
      
      this.snackBar.open(
        this.translate.instant('SETTINGS.MESSAGES.ORG_SAVED'), 
        this.translate.instant('SETTINGS.MESSAGES.CLOSE'), 
        { duration: 3000 }
      );
      this.logoFile = null; 
      this.cdr.detectChanges(); 
    } catch (e) {
      console.error(e);
      this.snackBar.open(this.translate.instant('SETTINGS.MESSAGES.ORG_FAILED'), 'Close', { duration: 3000 });
    } finally {
      this.loading = false;
    }
  }

  viewTerms() { 
    this.activeSection = 'terms';
  }
}