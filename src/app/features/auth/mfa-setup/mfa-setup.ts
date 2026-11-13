import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MessageModule } from 'primeng/message';
import { firstValueFrom } from 'rxjs';

import { ProfileApi } from '../../../core/api/profile.api';
import { problemMessage } from '../../../core/api/problem';
import { AuthService } from '../../../core/auth/auth.service';
import { Profile } from '../../../core/models/api.models';
import { MfaSettingsComponent } from '../../profile/mfa-settings/mfa-settings';

/**
 * Ativar a verificação em duas etapas (`/ativar-verificacao`), obrigatória para todas as contas: até ativar um
 * método (app autenticador ou código por e-mail) e guardar os códigos de recuperação, o app e o servidor não liberam
 * o resto.
 */
@Component({
  selector: 'app-mfa-setup',
  imports: [MessageModule, MfaSettingsComponent],
  template: `
    <div class="auth-page">
      <div class="forge-glow"></div>
      <div class="auth-card wide">
        <div class="brand">
          <div class="brand-icon">⚒</div>
          <h1 class="brand-title">Proteja sua conta</h1>
          <p class="brand-subtitle">
            No Booksmith, a verificação em duas etapas é obrigatória: além da senha (ou do Google), pedimos um código
            para entrar. Assim, ninguém abre seus livros só por descobrir a senha.
          </p>
        </div>

        @if (message(); as text) {
          <p-message severity="error" [text]="text" />
        }

        @if (user(); as u) {
          <app-mfa-settings [email]="u.email" [hasPassword]="u.hasPassword" (activated)="done()" />
        }

        <div class="footer-link"><button type="button" class="link-button" (click)="leave()">Sair</button></div>
      </div>
    </div>
  `,
  styleUrl: '../auth-page.scss',
  styles: `
    .wide { max-width: 520px; }
    .link-button { background: none; border: 0; color: var(--bs-ember); font: inherit; cursor: pointer;
      min-height: var(--bs-touch); }
  `,
})
export class MfaSetupComponent {
  private readonly auth = inject(AuthService);
  private readonly profiles = inject(ProfileApi);
  private readonly router = inject(Router);

  readonly user = signal<Profile['user'] | null>(null);
  readonly message = signal<string | null>(null);

  constructor() {
    void this.load();
  }

  /** Ativou: o token novo já libera o app. */
  async done(): Promise<void> {
    try {
      await this.auth.reloadSession();
      await this.router.navigate(['/home'], { replaceUrl: true });
    } catch (error) {
      this.message.set(problemMessage(error, 'Não foi possível continuar. Entre de novo.'));
    }
  }

  leave(): void {
    void this.auth.logout();
  }

  private async load(): Promise<void> {
    try {
      this.user.set((await firstValueFrom(this.profiles.get())).user);
    } catch (error) {
      this.message.set(problemMessage(error, 'Não foi possível carregar sua conta.'));
    }
  }
}
