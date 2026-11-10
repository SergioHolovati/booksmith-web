import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { SupportCategory, SupportContext, SupportRequest } from '../models/api.models';

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
}
