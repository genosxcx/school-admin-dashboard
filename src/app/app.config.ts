import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http'; 
import { provideTranslateService } from '@ngx-translate/core'; // ✅ Modern provider
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader'; // ✅ Modern loader
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideAnimations(),
    provideHttpClient(), 
    provideTranslateService({
      lang: 'en', 
      fallbackLang: 'en',
      loader: provideTranslateHttpLoader({
        prefix: '/assets/i18n/', // ✅ Points perfectly to public/assets/i18n/
        suffix: '.json'
      })
    })
  ],
};