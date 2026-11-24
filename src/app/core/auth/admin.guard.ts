import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';

import { ProfileApi } from '../api/profile.api';

/** Backoffice: só administradores entram (a API também confere cada chamada). Os outros voltam ao início. */
export const adminGuard: CanActivateFn = () => {
  const router = inject(Router);
  return inject(ProfileApi).get().pipe(
    map((profile) => (profile.user.admin ? true : router.createUrlTree(['/home']))),
    catchError(() => of(router.createUrlTree(['/home']))),
  );
};
