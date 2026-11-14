import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { IllustrationRequest, IllustrationResult, IllustrationStatus } from '../models/api.models';

/** Ilustrações com IA (Estúdio Visual): retrato de personagem e cena de capítulo. */
@Injectable({ providedIn: 'root' })
export class IllustrationApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/assist/illustrations`;

  status(): Observable<IllustrationStatus> {
    return this.http.get<IllustrationStatus>(`${this.base}/status`);
  }

  /** Leva de 10 a 60 segundos: a imagem já volta guardada na biblioteca do universo. */
  generate(request: IllustrationRequest): Observable<IllustrationResult> {
    return this.http.post<IllustrationResult>(this.base, request);
  }
}
