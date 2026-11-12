import { Component, DestroyRef, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';

import { problemMessage } from '../../../core/api/problem';
import { AuthService } from '../../../core/auth/auth.service';

/** Espera entre dois pedidos de código (o servidor também espera 60 segundos). */
export const RESEND_WAIT_SECONDS = 60;

/** Só letras e números, maiúsculo, até 6: o código pode vir colado do e-mail com espaço ou minúsculas. */
export function cleanCode(text: string): string {
  return text.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 6);
}

/**
 * Confirmar o e-mail (`/verificar-email?email=`): o código de 6 caracteres que chega por e-mail depois do cadastro.
 * Sem confirmar, o login não entra. Dá para pedir um código novo a cada minuto.
 */
@Component({
  selector: 'app-verify-email',
  imports: [FormsModule, RouterLink, ButtonModule, InputTextModule, MessageModule],
  template: `
    <div class="auth-page">
      <div class="forge-glow"></div>
      <div class="auth-card">
        <div class="brand">
          <div class="brand-icon">⚒</div>
          <h1 class="brand-title">Confirme seu e-mail</h1>
          <p class="brand-subtitle">Enviamos um código de 6 caracteres para
            <strong data-email>{{ address || 'o seu e-mail' }}</strong>. Confira também o spam.</p>
        </div>

        @if (message(); as text) {
          <p-message severity="error" [text]="text" />
        }

        <form class="form" (ngSubmit)="confirm()" #form="ngForm">
          @if (!email()) {
            <div class="field">
              <label for="email">E-mail</label>
              <input id="email" name="email" type="email" pInputText required email autocomplete="email"
                inputmode="email" [(ngModel)]="address" />
            </div>
          }
          <div class="field">
            <label for="code">Código</label>
            <input id="code" name="code" pInputText required autocomplete="one-time-code" autocapitalize="characters"
              maxlength="8" class="code-input" [ngModel]="code" (ngModelChange)="code = clean($event)" />
          </div>
          <p-button label="Confirmar" type="submit" styleClass="full-width" [loading]="loading()"
            [disabled]="code.length !== 6 || !address" />
        </form>

        <div class="link-row resend">
          @if (wait() > 0) {
            <span class="muted" data-resend-wait>Pedir outro código em {{ wait() }} s</span>
          } @else {
            <p-button label="Enviar outro código" [text]="true" [disabled]="!address" (onClick)="resend()" />
          }
        </div>

        <div class="footer-link"><a routerLink="/login">Voltar para o login</a></div>
      </div>
    </div>
  `,
  styleUrl: '../auth-page.scss',
  styles: `
    .code-input { letter-spacing: .35em; font-size: 1.3rem; text-align: center; }
    .resend { justify-content: center; }
  `,
})
export class VerifyEmailComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(MessageService);

  /** ?email= vindo do cadastro ou do login */
  readonly email = input<string>();
  /** ?sent=0: veio do login (o código antigo pode ter vencido); pede um novo assim que abrir */
  readonly sent = input<string>();

  address = '';
  code = '';
  readonly clean = cleanCode;
  readonly loading = signal(false);
  readonly message = signal<string | null>(null);
  readonly wait = signal(0);
  private timer: ReturnType<typeof setInterval> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearInterval(this.timer));
    queueMicrotask(() => {
      this.address = this.email() ?? '';
      if (this.sent() === '0' && this.address) {
        void this.resend();
      } else {
        this.startWait();
      }
    });
  }

  async confirm(): Promise<void> {
    this.loading.set(true);
    this.message.set(null);
    try {
      await this.auth.verifyEmail(this.address.trim(), this.code);
      this.toast.add({ severity: 'success', summary: 'E-mail confirmado', detail: 'Agora é só entrar.' });
      await this.router.navigate(['/login'], { queryParams: { email: this.address.trim() } });
    } catch (error) {
      this.message.set(problemMessage(error, 'Não foi possível confirmar o e-mail.'));
    } finally {
      this.loading.set(false);
    }
  }

  async resend(): Promise<void> {
    this.message.set(null);
    try {
      await this.auth.resendVerification(this.address.trim());
      this.toast.add({ severity: 'info', summary: 'Código enviado', detail: 'Confira sua caixa de entrada.' });
    } catch (error) {
      this.message.set(problemMessage(error, 'Não foi possível enviar o código.'));
    }
    this.startWait();
  }

  private startWait(): void {
    clearInterval(this.timer);
    this.wait.set(RESEND_WAIT_SECONDS);
    this.timer = setInterval(() => {
      this.wait.update((s) => Math.max(0, s - 1));
      if (this.wait() === 0) {
        clearInterval(this.timer);
      }
    }, 1000);
  }
}
