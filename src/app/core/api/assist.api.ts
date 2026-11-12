import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, firstValueFrom, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  AskRequest,
  AskResult,
  AssistStatus,
  ReviewRequest,
  ReviewResult,
  ReviewStart,
  SuggestionRequest,
  SuggestionResult,
} from '../models/api.models';

/**
 * Sugestões de IA. O estado (ligada? quanto falta hoje?) é pedido uma vez e fica num sinal, para todos os
 * botões "Ideias da IA" da tela; cada pedido atualiza o que falta.
 */
@Injectable({ providedIn: 'root' })
export class AssistApi {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;
  private loading: Promise<void> | null = null;

  readonly status = signal<AssistStatus | null>(null);

  /** Carrega o estado na primeira vez; falha = IA escondida (o resto da tela segue normal). */
  ensureStatus(): Promise<void> {
    this.loading ??= firstValueFrom(this.http.get<AssistStatus>(`${this.base}/assist/status`))
      .then((status) => this.status.set(status))
      .catch(() => {
        this.loading = null;
      });
    return this.loading;
  }

  suggest(request: SuggestionRequest): Observable<SuggestionResult> {
    return this.http.post<SuggestionResult>(`${this.base}/assist/suggestions`, request).pipe(
      tap((result) => this.status.update((s) => (s ? { ...s, remaining: result.remaining } : s))),
    );
  }

  /** Revisa uma parte do capítulo; o app pede as seguintes com `nextBlock` até acabar. */
  ask(request: AskRequest): Observable<AskResult> {
    return this.http.post<AskResult>(`${this.base}/assist/ask`, request).pipe(
      tap((result) => this.status.update((s) => (s ? { ...s, remaining: result.remaining } : s))),
    );
  }

  /** Abre a revisão com IA do capítulo: gasta um uso da cota. */
  startReview(bookId: string, chapterId: string): Observable<ReviewStart> {
    return this.http.post<ReviewStart>(`${this.base}/assist/review/start`, { bookId, chapterId }).pipe(
      tap((result) => this.status.update((s) => (s ? { ...s, remaining: result.remaining } : s))),
    );
  }

  review(request: ReviewRequest): Observable<ReviewResult> {
    return this.http.post<ReviewResult>(`${this.base}/assist/review`, request).pipe(
      tap((result) => this.status.update((s) => (s ? { ...s, remaining: result.remaining } : s))),
    );
  }
}
