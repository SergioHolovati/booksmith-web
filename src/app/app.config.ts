import { ApplicationConfig, isDevMode, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideServiceWorker } from '@angular/service-worker';
import { providePrimeNG } from 'primeng/config';
import { MessageService } from 'primeng/api';
import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

import { routes } from './app.routes';
import { authInterceptor } from './core/auth/auth.interceptor';

const BooksmithTheme = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#fff6ed',
      100: '#ffead5',
      200: '#ffd0aa',
      300: '#ffb26f',
      400: '#ff9442',
      500: '#ff7a1a',
      600: '#e7650d',
      700: '#c4510a',
      800: '#9f430f',
      900: '#813910',
      950: '#4a1f05',
    },
  },
});

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    providePrimeNG({
      theme: {
        preset: BooksmithTheme,
        // O app é sempre escuro (identidade "forja"): a classe fica fixa no <html> (index.html)
        options: { darkModeSelector: '.app-dark' },
      },
    }),
    provideRouter(routes, withComponentInputBinding()),
    provideAnimationsAsync(),
    provideHttpClient(withInterceptors([authInterceptor])),
    MessageService,
    // PWA: instalável e com o app disponível offline (o texto offline fica no IndexedDB, ver DraftStore)
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
