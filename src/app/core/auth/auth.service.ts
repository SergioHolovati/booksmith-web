import { HttpClient, HttpContext, HttpContextToken } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, finalize, firstValueFrom, map, shareReplay, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { RegisterRequest, SessionResponse } from '../models/api.models';
import { tokenStorage } from './token-storage';

/** Marca requisições que não devem disparar a renovação automática do token. */
export const SKIP_AUTH_REFRESH = new HttpContextToken<boolean>(() => false);

export interface SessionUser {
  id: string;
  username: string;
  displayName: string;
  /** Conta nova do Google: falta a data de nascimento; o app só abre a tela de completar o cadastro. */
  profilePending: boolean;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly base = `${environment.apiBaseUrl}/auth`;
  private readonly noRefresh = () => new HttpContext().set(SKIP_AUTH_REFRESH, true);

  private readonly token = signal<string | null>(tokenStorage.read());
  private refreshInFlight: Observable<string> | null = null;

  readonly accessToken = this.token.asReadonly();
  readonly isAuthenticated = computed(() => this.token() !== null);
  readonly user = computed<SessionUser | null>(() => decodeUser(this.token()));

  async login(email: string, password: string): Promise<void> {
    const session = await firstValueFrom(
      this.http.post<SessionResponse>(`${this.base}/login`, { email, password }, { context: this.noRefresh() }),
    );
    this.setToken(session.accessToken);
  }

  register(request: RegisterRequest): Promise<void> {
    return firstValueFrom(this.http.post<void>(`${this.base}/register`, request, { context: this.noRefresh() }));
  }

  forgotPassword(email: string): Promise<void> {
    return firstValueFrom(
      this.http.post<void>(`${this.base}/forgot-password`, { email }, { context: this.noRefresh() }),
    );
  }

  resetPassword(token: string, password: string): Promise<void> {
    return firstValueFrom(
      this.http.post<void>(`${this.base}/reset-password`, { token, password }, { context: this.noRefresh() }),
    );
  }

  /** Novo código para confirmar o e-mail (o servidor responde igual, exista ou não a conta). */
  resendVerification(email: string): Promise<void> {
    return firstValueFrom(
      this.http.post<void>(`${this.base}/resend-verification`, { email }, { context: this.noRefresh() }),
    );
  }

  verifyEmail(email: string, code: string): Promise<void> {
    return firstValueFrom(
      this.http.post<void>(`${this.base}/verify-email`, { email, code }, { context: this.noRefresh() }),
    );
  }

  /** Troca o código de uso único do login com Google pela sessão. */
  async exchangeGoogleCode(code: string): Promise<void> {
    const session = await firstValueFrom(
      this.http.post<SessionResponse>(`${this.base}/google/exchange`, { code }, { context: this.noRefresh() }),
    );
    this.setToken(session.accessToken);
  }

  /** Data de nascimento (idade mínima) e nome de usuário de quem entrou pelo Google; o token novo já libera o app. */
  async completeProfile(birthDate: string, username: string | null): Promise<void> {
    const session = await firstValueFrom(
      this.http.post<SessionResponse>(`${environment.apiBaseUrl}/profile/complete`, { birthDate, username }),
    );
    this.setToken(session.accessToken);
  }

  loginWithGoogle(): void {
    window.location.href = `${environment.authBaseUrl}/oauth2/authorization/google`;
  }

  /**
   * Renova o token uma única vez mesmo com várias requisições recebendo 401 ao mesmo tempo
   * (comum ao reabrir o app no celular depois de horas).
   */
  refresh(): Observable<string> {
    if (!this.refreshInFlight) {
      this.refreshInFlight = this.http
        .post<SessionResponse>(`${this.base}/refresh`, {}, { context: this.noRefresh() })
        .pipe(
          map((session) => session.accessToken),
          tap((token) => this.setToken(token)),
          finalize(() => (this.refreshInFlight = null)),
          shareReplay(1),
        );
    }
    return this.refreshInFlight;
  }

  async logout(): Promise<void> {
    try {
      if (this.token()) {
        await firstValueFrom(this.http.post<void>(`${this.base}/logout`, {}, { context: this.noRefresh() }));
      }
    } catch {
      // sessão já inválida no servidor: basta limpar localmente
    } finally {
      this.clearSession();
      await this.router.navigate(['/login']);
    }
  }

  clearSession(): void {
    this.setToken(null);
  }

  private setToken(token: string | null): void {
    tokenStorage.write(token);
    this.token.set(token);
  }
}

function decodeUser(token: string | null): SessionUser | null {
  if (!token) {
    return null;
  }
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = new TextDecoder().decode(Uint8Array.from(atob(payload), (c) => c.charCodeAt(0)));
    const claims = JSON.parse(json) as { sub: string; username?: string; name?: string; pending?: string | null };
    return {
      id: claims.sub,
      username: claims.username ?? '',
      displayName: claims.name || claims.username || 'Escritor',
      profilePending: claims.pending === 'profile',
    };
  } catch {
    return null;
  }
}
