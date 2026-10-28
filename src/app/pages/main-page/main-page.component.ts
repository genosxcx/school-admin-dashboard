import { Component, DestroyRef, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { LangSwitch } from '../../shared/lang-switch/lang-switch';

interface Project {
  id: string;
  arabicName: string;
  image: string;
  route: string;
  parts: string[];
}

// Text for these lists lives under HOME in public/assets/i18n/*.json.
interface Step {
  title: string;
  text: string;
}

@Component({
  selector: 'app-main-page',
  standalone: true,
  imports: [CommonModule, TranslatePipe, LangSwitch],
  templateUrl: './main-page.component.html',
  styleUrls: ['./main-page.component.css'],
})
export class MainPageComponent {
  private translate = inject(TranslateService);

  currentYear = new Date().getFullYear();
  lang = this.translate.getCurrentLang() || 'en';

  projects: Project[] = [
    {
      id: 'hya-naqraa',
      arabicName: 'هيّا نقرأ',
      image: '/assets/hya-naqraa.jpeg',
      route: '/hya-naqraa',
      parts: ['HOME.PART_STUDENT', 'HOME.PART_TEACHER', 'HOME.PART_ADMIN'],
    },
  ];

  steps: Step[] = [
    { title: 'HOME.STEP1_TITLE', text: 'HOME.STEP1_TEXT' },
    { title: 'HOME.STEP2_TITLE', text: 'HOME.STEP2_TEXT' },
    { title: 'HOME.STEP3_TITLE', text: 'HOME.STEP3_TEXT' },
  ];

  values: Step[] = [
    { title: 'HOME.VALUE1_TITLE', text: 'HOME.VALUE1_TEXT' },
    { title: 'HOME.VALUE2_TITLE', text: 'HOME.VALUE2_TEXT' },
    { title: 'HOME.VALUE3_TITLE', text: 'HOME.VALUE3_TEXT' },
  ];

  constructor(private router: Router) {
    this.translate.onLangChange
      .pipe(takeUntilDestroyed(inject(DestroyRef)))
      .subscribe((e) => (this.lang = e.lang));
  }

  get dir(): 'rtl' | 'ltr' {
    return this.lang === 'ar' || this.lang === 'he' ? 'rtl' : 'ltr';
  }

  navigateToProject(route: string): void {
    this.router.navigate([route]);
  }

  scrollTo(id: string): void {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }
}
