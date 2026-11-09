import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthService, SKIP_AUTH_REFRESH } from './auth.service';

/** Envia o token só para a API (nunca para o S3/CDN) e renova a sessão uma vez em caso de 401. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiBaseUrl)) {
    return next(req);
  }

  const auth = inject(AuthService);
  const withToken = (request: HttpRequest<unknown>, token: string | null) =>
    token ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : request;

  return next(withToken(req, auth.accessToken())).pipe(
    catchError((error: unknown) => {
      const canRefresh =
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        auth.accessToken() !== null &&
        !req.context.get(SKIP_AUTH_REFRESH);

      if (!canRefresh) {
        return throwError(() => error);
      }

      return auth.refresh().pipe(
        catchError((refreshError: unknown) => {
          // Sessão expirada de verdade: volta ao login (o rascunho local do editor é preservado)
          void auth.logout();
          return throwError(() => refreshError);
        }),
        switchMap((token) => next(withToken(req, token))),
      );
    }),
  );
};
