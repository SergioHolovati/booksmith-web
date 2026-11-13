import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';

import { problemMessage } from '../../core/api/problem';
import { AuthService } from '../../core/auth/auth.service';

/**
 * Versão nova dos termos (`/aceitar-termos`): quem já tem conta aceita antes de voltar a usar o app. Até aceitar, o
 * servidor responde 403 `terms_outdated` em tudo que não for esta tela.
 */
@Component({
  selector: 'app-accept-terms',
  imports: [FormsModule, RouterLink, ButtonModule, MessageModule],
  template: `
    <div class="auth-page">
      <div class="forge-glow"></div>
      <div class="auth-card">
        <div class="brand">
          <div class="brand-icon">⚒</div>
          <h1 class="brand-title">Os termos mudaram</h1>
          <p class="brand-subtitle">Para continuar, leia e aceite a nova versão.</p>
        </div>

        @if (message(); as text) {
          <p-message severity="error" [text]="text" />
        }

        <p class="small">Versão {{ version() ?? '…' }}:
          <a routerLink="/termos" target="_blank">Termos de uso e termo de responsabilidade</a> e
          <a routerLink="/privacidade" target="_blank">Política de privacidade</a>.</p>

        <label class="consent">
          <input id="acceptTerms" name="acceptTerms" type="checkbox" [(ngModel)]="accepted" />
          <span>Li e aceito os Termos de uso, o Termo de responsabilidade e a Política de privacidade.</span>
        </label>

        <p-button label="Aceitar e continuar" styleClass="full-width" [loading]="loading()" [disabled]="!accepted"
          (onClick)="accept()" />

        <div class="footer-link"><button type="button" class="link-button" (click)="leave()">Sair</button></div>
      </div>
    </div>
  `,
  styleUrl: '../auth/auth-page.scss',
  styles: `
    .link-button { background: none; border: 0; color: var(--bs-ember); font: inherit; cursor: pointer;
      min-height: var(--bs-touch); }
    a { color: var(--bs-ember); }
  `,
})
export class AcceptTermsComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  accepted = false;
  readonly loading = signal(false);
  readonly message = signal<string | null>(null);
  readonly version = signal<string | null>(null);

  constructor() {
    void this.auth.config().then((config) => this.version.set(config.termsVersion)).catch(() => undefined);
  }

  async accept(): Promise<void> {
    this.loading.set(true);
    this.message.set(null);
    try {
      await this.auth.acceptTerms();
      await this.router.navigate(['/home'], { replaceUrl: true });
    } catch (error) {
      this.message.set(problemMessage(error, 'Não foi possível registrar o aceite.'));
    } finally {
      this.loading.set(false);
    }
  }

  leave(): void {
    void this.auth.logout();
  }
}
