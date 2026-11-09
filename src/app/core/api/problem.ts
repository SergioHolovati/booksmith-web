import { HttpErrorResponse } from '@angular/common/http';

import { ProblemDetail } from '../models/api.models';

export function problemOf(error: unknown): ProblemDetail | null {
  if (error instanceof HttpErrorResponse && error.error && typeof error.error === 'object') {
    return { status: error.status, ...(error.error as Partial<ProblemDetail>) } as ProblemDetail;
  }
  return null;
}

/** Mensagem legível para o usuário a partir de um erro da API. */
export function problemMessage(error: unknown, fallback = 'Algo deu errado. Tente novamente.'): string {
  if (error instanceof HttpErrorResponse && error.status === 0) {
    return 'Sem conexão com o servidor. Verifique sua internet.';
  }
  const problem = problemOf(error);
  if (problem?.errors?.length) {
    return problem.errors.map((e) => e.message).join(' ');
  }
  return problem?.detail ?? fallback;
}

export function isNetworkError(error: unknown): boolean {
  return error instanceof HttpErrorResponse && error.status === 0;
}
