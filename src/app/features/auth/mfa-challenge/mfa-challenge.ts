import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';

import { problemMessage, problemOf } from '../../../core/api/problem';
import { AuthService } from '../../../core/auth/auth.service';
import { MfaChallenge, MfaMethod, ProblemDetail } from '../../../core/models/api.models';

/** O que a tela do código recebe do login (ou da volta do Google), pelo estado da navegação. */
export function mfaState(problem: ProblemDetail): MfaChallenge {
  return { challenge: problem.challenge ?? '', methods: problem.methods ?? [] };
}

/** O texto da tela conforme os métodos da conta. */
export function mfaHint(methods: MfaMethod[], recovery: boolean): string {
  if (recovery) {
    return 'Digite um dos códigos de recuperação que você guardou (ex.: ABCD-2345). Cada um vale uma vez.';
  }
  if (methods.includes('totp')) {
    return 'Abra o app autenticador e digite o código de 6 números do Booksmith.';
  }
  return 'Toque em "Enviar código por e-mail" e digite o código de 6 números que chegar.';
}

/**
 * Segunda etapa do login (`/verificacao`): o código do app autenticador, do e-mail ou de recuperação. O desafio vem
 * do login pelo estado da navegação (não pela URL) e vale 5 minutos; sem ele, volta ao login.
 */
@Component({
  selector: 'app-mfa-challenge',
  imports: [FormsModule, RouterLink, ButtonModule, InputTextModule, MessageModule],
  template: `
    <div class="auth-page">
      <div class="forge-glow"></div>
      <div class="auth-card">
        <div class="brand">
          <div class="brand-icon">⚒</div>
          <h1 class="brand-title">Verificação em duas etapas</h1>
          <p class="brand-subtitle" data-mfa-hint>{{ hint() }}</p>
        </div>

        @if (message(); as text) {
          <p-message severity="error" [text]="text" />
        }

        <form class="form" (ngSubmit)="verify()">
          <div class="field">
            <label for="mfa-code">{{ recovery() ? 'Código de recuperação' : 'Código' }}</label>
            <input id="mfa-code" name="code" pInputText required autocomplete="one-time-code"
              [attr.inputmode]="recovery() ? 'text' : 'numeric'" maxlength="12" class="code-input"
              [(ngModel)]="code" />
          </div>
          <p-button label="Entrar" type="submit" styleClass="full-width" [loading]="loading()" [disabled]="!code.trim()" />
        </form>

        <div class="options">
          @if (state.methods.includes('email') && !recovery()) {
            <p-button label="Enviar código por e-mail" icon="pi pi-envelope" [text]="true" [loading]="sending()"
              (onClick)="sendEmail()" />
          }
          <p-button [label]="recovery() ? 'Usar o código do app ou do e-mail' : 'Usar um código de recuperação'"
            [text]="true" severity="secondary" (onClick)="recovery.set(!recovery())" />
        </div>

        <div class="footer-link"><a routerLink="/login">Voltar para o login</a></div>
      </div>
    </div>
  `,
  styleUrl: '../auth-page.scss',
  styles: `
    .code-input { letter-spacing: .3em; font-size: 1.3rem; text-align: center; }
    .options { display: flex; flex-direction: column; align-items: center; gap: .25rem; margin-top: .75rem; }
  `,
})
export class MfaChallengeComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(MessageService);

  /** Do estado da navegação em curso; ao recarregar a página, do history.state (onde o Angular o guarda). */
  readonly state: MfaChallenge = (this.router.currentNavigation()?.extras.state ?? history.state ?? {}) as MfaChallenge;
  code = '';
  readonly recovery = signal(false);
  readonly loading = signal(false);
  readonly sending = signal(false);
  readonly message = signal<string | null>(null);

  constructor() {
    if (!this.state?.challenge) {
      void this.router.navigate(['/login'], { replaceUrl: true });
    }
  }

  hint(): string {
    return mfaHint(this.state.methods ?? [], this.recovery());
  }

  async verify(): Promise<void> {
    this.loading.set(true);
    this.message.set(null);
    try {
      await this.auth.verifyMfa(this.state.challenge, this.code.trim());
      const target = this.auth.user()?.profilePending ? '/completar-cadastro' : '/home';
      await this.router.navigate([target], { replaceUrl: true });
    } catch (error) {
      if (problemOf(error)?.code === 'mfa_challenge_expired') {
        this.toast.add({ severity: 'warn', summary: problemMessage(error) });
        await this.router.navigate(['/login'], { replaceUrl: true });
        return;
      }
      this.message.set(problemMessage(error, 'Não foi possível conferir o código.'));
    } finally {
      this.loading.set(false);
    }
  }

  async sendEmail(): Promise<void> {
    this.sending.set(true);
    this.message.set(null);
    try {
      await this.auth.sendMfaEmail(this.state.challenge);
      this.toast.add({ severity: 'info', summary: 'Código enviado', detail: 'Confira sua caixa de entrada.' });
    } catch (error) {
      this.message.set(problemMessage(error, 'Não foi possível enviar o código.'));
    } finally {
      this.sending.set(false);
    }
  }
}
