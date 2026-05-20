import {
  HttpErrorResponse,
  HttpInterceptorFn
} from '@angular/common/http';

import { inject }
from '@angular/core';

import { Router }
from '@angular/router';

import {
  catchError,
  switchMap,
  throwError
} from 'rxjs';

import { AuthService }
from '../services/auth-service';

export const authInterceptor:
HttpInterceptorFn = (
  req,
  next
) => {

  const router =
    inject(Router);

  const authService =
    inject(AuthService);

  const token =
    authService
      .getAccessToken();

  const authReq =
    token
      ? req.clone({
          setHeaders: {
            Authorization:
              `Bearer ${token}`
          }
        })
      : req;

  return next(
    authReq
  ).pipe(

    catchError((
      error:
        HttpErrorResponse
    ) => {

      const isUnauthorized =
        error.status === 401 ||
        error.status === 403;

      const isRefreshRequest =
        req.url.includes(
          '/auth/refresh'
        );

      if (
        isUnauthorized &&
        !isRefreshRequest
      ) {

        return authService
          .refreshToken()
          .pipe(

            switchMap(
              (response) => {

              authService
                .saveToken(
                  response.token
                );

              const retryReq =
                req.clone({
                  setHeaders: {
                    Authorization:
                      `Bearer ${response.token}`
                  }
                });

              return next(
                retryReq
              );
            }),

            catchError(() => {

              authService
                .logout();

              return throwError(
                () => error
              );
            })
          );
      }

      return throwError(
        () => error
      );
    })
  );
};