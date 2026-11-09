import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AlertStatus, ContinuityAlert, ContinuityOverview } from '../models/api.models';

/** Agente de continuidade: alertas do livro e análise sob demanda. */
@Injectable({ providedIn: 'root' })
export class ContinuityApi {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  overview(bookId: string): Observable<ContinuityOverview> {
    return this.http.get<ContinuityOverview>(`${this.base}/books/${bookId}/continuity`);
  }

  analyze(bookId: string): Observable<ContinuityOverview> {
    return this.http.post<ContinuityOverview>(`${this.base}/books/${bookId}/continuity/analyze`, {});
  }

  setStatus(alertId: string, status: AlertStatus): Observable<ContinuityAlert> {
    return this.http.patch<ContinuityAlert>(`${this.base}/continuity/alerts/${alertId}`, { status });
  }
}
