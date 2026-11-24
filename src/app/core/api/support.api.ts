import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { SupportCategory, SupportContext, SupportConversation, SupportRequest } from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class SupportApi {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  create(category: SupportCategory, message: string, context: SupportContext): Observable<SupportRequest> {
    return this.http.post<SupportRequest>(`${this.base}/support/requests`, { category, message, context });
  }

  mine(): Observable<SupportRequest[]> {
    return this.http.get<SupportRequest[]>(`${this.base}/me/support/requests`);
  }

  conversation(id: string): Observable<SupportConversation> {
    return this.http.get<SupportConversation>(`${this.base}/me/support/requests/${id}`);
  }

  reply(id: string, body: string): Observable<SupportConversation> {
    return this.http.post<SupportConversation>(`${this.base}/me/support/requests/${id}/messages`, { body });
  }
}
