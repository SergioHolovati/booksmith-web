import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { catchError, filter, throwError } from 'rxjs';

/** Versão do app que vai no pedido de suporte. */
export const APP_VERSION = '0.1.0';

const TRACE_HEADER = 'X-Request-Trace-Id';
const MAX_TRACES = 10;

/**
 * Rastro técnico para o pedido de suporte: os últimos erros da API (o trace id de cada um, que acha a
 * requisição no log) e a última tela fora da Ajuda. Nada do texto do livro passa por aqui.
 */
@Injectable({ providedIn: 'root' })
export class ErrorTrail {
  private readonly traces: string[] = [];
  private lastRoute = '/';

  constructor() {
    inject(Router)
      .events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => {
        if (!e.urlAfterRedirects.startsWith('/ajuda')) {
          this.lastRoute = e.urlAfterRedirects;
        }
      });
  }

  record(traceId: string | null): void {
    if (!traceId || this.traces.includes(traceId)) {
      return;
    }
    this.traces.unshift(traceId);
    this.traces.length = Math.min(this.traces.length, MAX_TRACES);
  }

  recentTraces(): string[] {
    return [...this.traces];
  }

  /** Tela onde a pessoa estava antes de abrir a Ajuda, sem a query string (pode ter texto de busca). */
  route(): string {
    return this.lastRoute.split('?')[0];
  }
}

/** Guarda o trace id das respostas com erro (menos 401, que é só a sessão expirando e sendo renovada). */
export const errorTrailInterceptor: HttpInterceptorFn = (req, next) => {
  const trail = inject(ErrorTrail);
  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status !== 401) {
        trail.record(error.headers?.get(TRACE_HEADER) ?? null);
      }
      return throwError(() => error);
    }),
  );
};
