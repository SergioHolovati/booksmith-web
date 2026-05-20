import {
  ApplicationConfig
} from '@angular/core';

import {
  providePrimeNG
} from 'primeng/config';

import Aura from
'@primeuix/themes/aura';

import {
  definePreset
} from '@primeuix/themes';

import {
  provideAnimationsAsync
} from '@angular/platform-browser/animations/async';

import {
  provideRouter
} from '@angular/router';

import {
  provideHttpClient,
  withInterceptors
} from '@angular/common/http';

import {
  routes
} from './app.routes';

import {
  authInterceptor
} from './core/interceptors/auth-interceptor';

const BooksmithTheme =
definePreset(
  Aura,
  {
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
        950: '#4a1f05'
      }
    }
  }
);

export const appConfig:
ApplicationConfig = {

  providers: [

    providePrimeNG({
      theme: {
        preset:
          BooksmithTheme
      }
    }),

    provideRouter(
      routes
    ),

    provideAnimationsAsync(),

    provideHttpClient(
      withInterceptors([
        authInterceptor
      ])
    )
  ]
};