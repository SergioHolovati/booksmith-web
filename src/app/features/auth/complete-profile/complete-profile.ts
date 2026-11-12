import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';

import { problemMessage, problemOf } from '../../../core/api/problem';
import { AuthService } from '../../../core/auth/auth.service';

/** Mesma regra do servidor (e do cadastro): letras, números, ponto, hífen ou _. */
export const USERNAME_PATTERN = /^[a-zA-Z0-9._-]{2,40}$/;

/**
 * Completar o cadastro (`/completar-cadastro`): quem entrou pelo Google informa a data de nascimento (idade mínima)
 * e confirma o nome de usuário. Até completar, o app e o servidor não liberam o resto.
 */
@Component({
  selector: 'app-complete-profile',
  imports: [FormsModule, ButtonModule, InputTextModule, MessageModule],
  template: `
    <div class="auth-page">
      <div class="forge-glow"></div>
      <div class="auth-card">
        <div class="brand">
          <div class="brand-icon">⚒</div>
          <h1 class="brand-title">Falta pouco, {{ firstName }}</h1>
          <p class="brand-subtitle">Complete seu cadastro para começar a escrever.</p>
        </div>

        @if (message(); as text) {
          <p-message severity="error" [text]="text" />
        }

        <form class="form" (ngSubmit)="submit()" #form="ngForm">
          <div class="field">
            <label for="birthDate">Data de nascimento</label>
            <input id="birthDate" name="birthDate" type="date" class="bs-input" required [max]="today"
              autocomplete="bday" [(ngModel)]="birthDate" />
            <small class="field-hint">Usamos para proteger contas de menores de idade.</small>
          </div>
          <div class="field">
            <label for="username">Nome de usuário</label>
            <input id="username" name="username" pInputText required autocapitalize="none" autocomplete="username"
              [(ngModel)]="username" />
            @if (username && !validUsername()) {
              <small class="error-text">De 2 a 40 caracteres: letras, números, ponto, hífen ou _.</small>
            }
          </div>
          <p-button label="Continuar" type="submit" styleClass="full-width" [loading]="loading()"
            [disabled]="!birthDate || !validUsername()" />
        </form>

        <div class="footer-link"><button type="button" class="link-button" (click)="leave()">Sair</button></div>
      </div>
    </div>
  `,
  styleUrl: '../auth-page.scss',
  styles: `
    .link-button { background: none; border: 0; color: var(--bs-ember); font: inherit; cursor: pointer;
      min-height: var(--bs-touch); }
  `,
})
export class CompleteProfileComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly today = new Date().toISOString().slice(0, 10);
  readonly firstName = (this.auth.user()?.displayName ?? '').split(' ')[0] || 'autor';
  birthDate = '';
  username = this.auth.user()?.username ?? '';
  readonly loading = signal(false);
  readonly message = signal<string | null>(null);

  validUsername(): boolean {
    return USERNAME_PATTERN.test(this.username.trim());
  }

  async submit(): Promise<void> {
    this.loading.set(true);
    this.message.set(null);
    try {
      await this.auth.completeProfile(this.birthDate, this.username.trim());
      await this.router.navigate(['/home'], { replaceUrl: true });
    } catch (error) {
      if (problemOf(error)?.code === 'age_below_minimum') {
        // Abaixo da idade mínima: o servidor encerrou as sessões
        this.auth.clearSession();
      }
      this.message.set(problemMessage(error, 'Não foi possível completar o cadastro.'));
    } finally {
      this.loading.set(false);
    }
  }

  leave(): void {
    void this.auth.logout();
  }
}
