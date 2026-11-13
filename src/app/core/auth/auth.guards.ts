import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  if (!auth.isAuthenticated()) {
    return inject(Router).createUrlTree(['/login']);
  }
  // Conta nova do Google: antes de tudo, completar o cadastro (o servidor também bloqueia o resto)
  if (auth.user()?.profilePending) {
    return inject(Router).createUrlTree(['/completar-cadastro']);
  }
  // Versão nova dos termos
  if (auth.user()?.termsPending) {
    return inject(Router).createUrlTree(['/aceitar-termos']);
  }
  // Verificação em duas etapas obrigatória e ainda não ativada
  return auth.user()?.mfaPending ? inject(Router).createUrlTree(['/ativar-verificacao']) : true;
};

/** A tela de aceitar a versão nova dos termos: só para quem entrou e está com o aceite pendente. */
export const pendingTermsGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  if (!auth.isAuthenticated()) {
    return inject(Router).createUrlTree(['/login']);
  }
  if (auth.user()?.profilePending) {
    return inject(Router).createUrlTree(['/completar-cadastro']);
  }
  return auth.user()?.termsPending ? true : inject(Router).createUrlTree(['/home']);
};

/** A tela de ativar a verificação em duas etapas: só para quem entrou e ainda não ativou. */
export const pendingMfaGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  if (!auth.isAuthenticated()) {
    return inject(Router).createUrlTree(['/login']);
  }
  if (auth.user()?.profilePending) {
    return inject(Router).createUrlTree(['/completar-cadastro']);
  }
  if (auth.user()?.termsPending) {
    return inject(Router).createUrlTree(['/aceitar-termos']);
  }
  return auth.user()?.mfaPending ? true : inject(Router).createUrlTree(['/home']);
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
