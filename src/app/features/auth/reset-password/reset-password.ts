import { Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';

import { problemMessage } from '../../../core/api/problem';
import { AuthService } from '../../../core/auth/auth.service';
import { PASSWORD_PATTERN, passwordChecks } from '../password-rules';

@Component({
  selector: 'app-reset-password',
  imports: [FormsModule, RouterLink, ButtonModule, InputTextModule, MessageModule],
  template: `
    <div class="auth-page">
      <div class="forge-glow"></div>
      <div class="auth-card">
        <div class="brand">
          <div class="brand-icon">⚒</div>
          <h1 class="brand-title">Nova senha</h1>
        </div>

        @if (!token()) {
          <p-message severity="error" text="Link inválido. Peça um novo na tela de login." />
        } @else {
          @if (message(); as text) {
            <p-message severity="error" [text]="text" />
          }
          <form class="form" (ngSubmit)="submit()">
            <div class="field">
              <label for="password">Nova senha</label>
              <input id="password" name="password" type="password" pInputText autocomplete="new-password"
                [(ngModel)]="password" />
              <div class="password-rules">
                @for (rule of checks(); track rule.label) {
                  <span [class.ok]="rule.ok">
                    <i class="pi" [class.pi-check]="rule.ok" [class.pi-circle]="!rule.ok"></i> {{ rule.label }}
                  </span>
                }
              </div>
            </div>
            <p-button label="Salvar nova senha" type="submit" styleClass="full-width" [loading]="loading()"
              [disabled]="!valid()" />
          </form>
        }

        <div class="footer-link"><a routerLink="/forgot-password">Pedir outro link</a></div>
      </div>
    </div>
  `,
  styleUrl: '../auth-page.scss',
})
export class ResetPasswordComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(MessageService);

  /** ?token= do link enviado por e-mail */
  readonly token = input<string>();

  password = '';
  readonly loading = signal(false);
  readonly message = signal<string | null>(null);

  checks() {
    return passwordChecks(this.password);
  }

  valid(): boolean {
    return PASSWORD_PATTERN.test(this.password);
  }

  async submit(): Promise<void> {
    const token = this.token();
    if (!token || !this.valid()) {
      return;
    }
    this.loading.set(true);
    this.message.set(null);
    try {
      await this.auth.resetPassword(token, this.password);
      this.toast.add({ severity: 'success', summary: 'Senha alterada', detail: 'Entre com a nova senha.' });
      await this.router.navigate(['/login']);
    } catch (error) {
      this.message.set(problemMessage(error));
    } finally {
      this.loading.set(false);
    }
  }
}
