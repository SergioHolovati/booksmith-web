import { HttpClient, HttpInterceptorFn } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { WritingStats } from '../models/api.models';

/** Fuso do aparelho ("America/Sao_Paulo"): a meta do dia vira à meia-noite de quem escreve, não do servidor. */
export function deviceTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

/** Manda o fuso do aparelho em todas as chamadas à API (o salvamento automático soma as palavras ao dia certo). */
export const timeZoneInterceptor: HttpInterceptorFn = (req, next) => {
  const zone = deviceTimeZone();
  if (!zone || !req.url.startsWith(environment.apiBaseUrl)) {
    return next(req);
  }
  return next(req.clone({ setHeaders: { 'X-Time-Zone': zone } }));
};

/** Meta diária de palavras e sequência de dias. */
@Injectable({ providedIn: 'root' })
export class WritingApi {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  stats(): Observable<WritingStats> {
    return this.http.get<WritingStats>(`${this.base}/me/writing-stats`);
  }

  /** `dailyWords` null tira a meta. */
  setGoal(dailyWords: number | null): Observable<number | null> {
    return this.http
      .put<{ dailyWords: number | null }>(`${this.base}/me/writing-goal`, { dailyWords })
      .pipe(map((r) => r.dailyWords));
  }
}

/** Sequência depois de hoje: se a meta de hoje acabou de ser batida, o dia de hoje entra na conta. */
export function streakAfterToday(stats: WritingStats, todayWords: number): number {
  const threshold = stats.goal ?? 1;
  if (stats.goalReached || (stats.goal === null && stats.today > 0)) {
    return stats.streak;
  }
  return todayWords >= threshold ? stats.streak + 1 : stats.streak;
}
