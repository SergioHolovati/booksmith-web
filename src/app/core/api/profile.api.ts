import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthorProfile, AuthorProfileRequest, DeviceSession, Profile } from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class ProfileApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/profile`;
  private readonly sessionsUrl = `${environment.apiBaseUrl}/me/sessions`;
  private readonly googleUrl = `${environment.apiBaseUrl}/me/google`;

  get(): Observable<Profile> {
    return this.http.get<Profile>(this.base);
  }

  createAuthor(request: AuthorProfileRequest): Observable<AuthorProfile> {
    return this.http.post<AuthorProfile>(`${this.base}/author`, request);
  }

  updateAuthor(request: AuthorProfileRequest): Observable<AuthorProfile> {
    return this.http.put<AuthorProfile>(`${this.base}/author`, request);
  }

  /** Tíquete de uso único (5 minutos) para ligar o Google a esta conta. */
  startGoogleLink(): Observable<{ ticket: string }> {
    return this.http.post<{ ticket: string }>(`${this.googleUrl}/link`, {});
  }

  /** Desliga o Google (só para quem tem senha). */
  unlinkGoogle(): Observable<void> {
    return this.http.delete<void>(this.googleUrl);
  }

  sessions(): Observable<DeviceSession[]> {
    return this.http.get<DeviceSession[]>(this.sessionsUrl);
  }

  endSession(id: string): Observable<void> {
    return this.http.delete<void>(`${this.sessionsUrl}/${encodeURIComponent(id)}`);
  }

  /** Desconecta todos os aparelhos menos este. */
  endOtherSessions(): Observable<{ ended: number }> {
    return this.http.delete<{ ended: number }>(this.sessionsUrl);
  }
}
