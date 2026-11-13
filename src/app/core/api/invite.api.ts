import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { InviteView } from '../models/api.models';

/** Convites do beta fechado (só administradores). */
@Injectable({ providedIn: 'root' })
export class InviteApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/admin/invites`;

  list(): Observable<InviteView[]> {
    return this.http.get<InviteView[]>(this.base);
  }

  create(request: { count: number; maxUses: number; note: string | null; expiresInDays: number | null }): Observable<InviteView[]> {
    return this.http.post<InviteView[]>(this.base, request);
  }

  revoke(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
