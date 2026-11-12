import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  if (!auth.isAuthenticated()) {
    return inject(Router).createUrlTree(['/login']);
  }
  // Conta nova do Google: antes de tudo, completar o cadastro (o servidor também bloqueia o resto)
  return auth.user()?.profilePending ? inject(Router).createUrlTree(['/completar-cadastro']) : true;
};

/** A tela de completar o cadastro: só para quem entrou e ainda tem o cadastro pendente. */
export const pendingProfileGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  if (!auth.isAuthenticated()) {
    return inject(Router).createUrlTree(['/login']);
  }
  return auth.user()?.profilePending ? true : inject(Router).createUrlTree(['/home']);
};

/** Quem já está logado não precisa ver login e cadastro. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isAuthenticated() ? inject(Router).createUrlTree(['/home']) : true;
};
