import { ApplicationConfig } from '@angular/core';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeuix/themes/aura';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { routes } from './app.routes';
import { provideRouter } from '@angular/router';

export const appConfig: ApplicationConfig = {
    providers: [
        providePrimeNG({
            theme: {
                preset: Aura
            }
        }),
      provideRouter(routes),
      provideAnimationsAsync()
    ]
};