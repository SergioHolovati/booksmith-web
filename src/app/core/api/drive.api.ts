import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { DriveBackupResult, DriveStatus } from '../models/api.models';

/** Backup dos livros no Google Drive da pessoa. */
@Injectable({ providedIn: 'root' })
export class DriveApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/me/drive`;

  status(): Observable<DriveStatus> {
    return this.http.get<DriveStatus>(this.base);
  }

  /** O endereço do Google para autorizar o Drive. */
  connect(): Observable<{ url: string }> {
    return this.http.post<{ url: string }>(`${this.base}/connect`, {});
  }

  backup(): Observable<DriveBackupResult> {
    return this.http.post<DriveBackupResult>(`${this.base}/backup`, {});
  }

  disconnect(): Observable<void> {
    return this.http.delete<void>(this.base);
  }
}
