import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';

import { problemMessage } from '../../../core/api/problem';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-forgot-password',
  imports: [FormsModule, RouterLink, ButtonModule, InputTextModule, MessageModule],
  template: `
    <div class="auth-page">
      <div class="forge-glow"></div>
      <div class="auth-card">
        <div class="brand">
          <div class="brand-icon">⚒</div>
          <h1 class="brand-title">Esqueceu a senha?</h1>
          <p class="brand-subtitle">Enviamos um link para você criar uma nova</p>
        </div>

        @if (sent()) {
          <div class="success-box">
            Se existir uma conta com este e-mail, você vai receber o link em instantes. Confira também o spam.
          </div>
        } @else {
          @if (message(); as text) {
            <p-message severity="error" [text]="text" />
          }
          <form class="form" (ngSubmit)="submit()" #form="ngForm">
            <div class="field">
              <label for="email">E-mail</label>
              <input id="email" name="email" type="email" pInputText required email autocomplete="email"
                inputmode="email" [(ngModel)]="email" />
            </div>
            <p-button label="Enviar link" type="submit" styleClass="full-width" [loading]="loading()"
              [disabled]="form.invalid ?? true" />
          </form>
        }

        <div class="footer-link"><a routerLink="/login">Voltar para o login</a></div>
      </div>
    </div>
  `,
  styleUrl: '../auth-page.scss',
})
export class ForgotPasswordComponent {
  private readonly auth = inject(AuthService);

  email = '';
  readonly loading = signal(false);
  readonly sent = signal(false);
  readonly message = signal<string | null>(null);

  async submit(): Promise<void> {
    this.loading.set(true);
    this.message.set(null);
    try {
      await this.auth.forgotPassword(this.email.trim());
      this.sent.set(true);
    } catch (error) {
      this.message.set(problemMessage(error));
    } finally {
      this.loading.set(false);
    }
  }
}
