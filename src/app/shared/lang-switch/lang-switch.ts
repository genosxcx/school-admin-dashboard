import { Component, inject, input, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

// EN / AR / HE switcher for the public pages (homepage and auth). Saves the
// choice the same way Settings does, so the dashboard opens in the language
// picked here. Use [light]="true" on light backgrounds.
@Component({
  selector: 'app-lang-switch',
  standalone: true,
  imports: [TranslatePipe],
  template: `
    <div class="switch" [class.light]="light()" role="group" [attr.aria-label]="'AUTH.LANGUAGE' | translate">
      @for (l of langs; track l.code) {
        <button
          type="button"
          [class.active]="current === l.code"
          [attr.aria-pressed]="current === l.code"
          [attr.lang]="l.code"
          (click)="use(l.code)">
          {{ l.label }}
        </button>
      }
    </div>
  `,
  styles: `
    .switch {
      display: inline-flex;
      gap: 2px;
      padding: 3px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.08);
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.12);
    }
    button {
      padding: 6px 12px;
      border: 0;
      border-radius: 999px;
      background: transparent;
      color: rgba(255, 255, 255, 0.7);
      font: inherit;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      transition: background 0.2s ease, color 0.2s ease;
    }
    button:hover {
      color: #fff;
    }
    button.active {
      background: #fff;
      color: var(--ns-ink);
    }
    .light {
      background: var(--ns-card, #fff);
      box-shadow: inset 0 0 0 1px var(--ns-line);
    }
    .light button {
      color: var(--ns-muted);
    }
    .light button:hover {
      color: var(--ns-ink);
    }
    .light button.active {
      background: var(--ns-ink);
      color: #fff;
    }
    button:focus-visible {
      outline: 2px solid var(--ns-accent);
      outline-offset: 2px;
    }
  `,
})
export class LangSwitch {
  private translate = inject(TranslateService);
  private platformId = inject(PLATFORM_ID);

  light = input(false);

  langs = [
    { code: 'en', label: 'EN' },
    { code: 'ar', label: 'عربي' },
    { code: 'he', label: 'עברית' },
  ];

  current = this.initialLang();

  private initialLang(): string {
    if (isPlatformBrowser(this.platformId)) {
      const saved = localStorage.getItem('appLang');
      if (saved) return saved;
    }
    return this.translate.getCurrentLang() || 'en';
  }

  use(lang: string) {
    this.current = lang;
    this.translate.use(lang);

    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('appLang', lang);
      document.documentElement.dir = lang === 'ar' || lang === 'he' ? 'rtl' : 'ltr';
      document.documentElement.lang = lang;
    }
  }
}
