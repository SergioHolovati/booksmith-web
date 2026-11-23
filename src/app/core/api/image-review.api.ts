import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

/** Imagem que a moderação separou: para revisar (entrou) ou recusada (não foi guardada). */
export interface ImageReview {
  id: string;
  ownerId: string;
  ownerEmail: string | null;
  category: 'AVATAR' | 'BOOK_COVER' | 'UNIVERSE_MAP' | 'GALLERY';
  url: string | null;
  /** Probabilidade de ser imprópria, de 0 a 1. */
  score: number;
  status: 'pending' | 'blocked' | 'kept' | 'removed';
  createdAt: string;
  decidedAt: string | null;
}

/** Revisão das imagens da moderação (só administradores). */
@Injectable({ providedIn: 'root' })
export class ImageReviewApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/admin/image-reviews`;

  list(): Observable<ImageReview[]> {
    return this.http.get<ImageReview[]>(this.base);
  }

  keep(id: string): Observable<void> {
    return this.http.post<void>(`${this.base}/${id}/keep`, {});
  }

  remove(id: string): Observable<void> {
    return this.http.post<void>(`${this.base}/${id}/remove`, {});
  }
}
