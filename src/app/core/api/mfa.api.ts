import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { MfaStatus, TotpSetup } from '../models/api.models';

/** Verificação em duas etapas da conta logada (Perfil). */
@Injectable({ providedIn: 'root' })
export class MfaApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/me/mfa`;

  status(): Observable<MfaStatus> {
    return this.http.get<MfaStatus>(this.base);
  }

  startTotp(): Observable<TotpSetup> {
    return this.http.post<TotpSetup>(`${this.base}/totp`, {});
  }

  startEmail(): Observable<void> {
    return this.http.post<void>(`${this.base}/email`, {});
  }

  /** Confirma o método; no primeiro, devolve os códigos de recuperação (só desta vez). */
  confirm(method: 'totp' | 'email', code: string): Observable<{ recoveryCodes: string[] }> {
    return this.http.post<{ recoveryCodes: string[] }>(`${this.base}/${method}/confirm`, { code });
  }

  /** Código por e-mail para confirmar uma ação (desativar, novos códigos). */
  sendCode(): Observable<void> {
    return this.http.post<void>(`${this.base}/code`, {});
  }

  regenerateRecoveryCodes(code: string): Observable<{ recoveryCodes: string[] }> {
    return this.http.post<{ recoveryCodes: string[] }>(`${this.base}/recovery-codes`, { code });
  }

  disable(password: string | null, code: string): Observable<void> {
    return this.http.post<void>(`${this.base}/disable`, { password, code });
  }
}
