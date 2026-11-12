import { Component, computed, inject, input, output, signal } from '@angular/core';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageModule } from 'primeng/message';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { ProfileApi } from '../../../core/api/profile.api';
import { problemMessage } from '../../../core/api/problem';
import { Profile } from '../../../core/models/api.models';

/** O que a volta do Google ({@code /profile?google=}) quer dizer. */
export const LINK_RESULTS: Record<string, { severity: 'success' | 'warn' | 'error'; text: string }> = {
  linked: { severity: 'success', text: 'Pronto: agora você também entra com o Google.' },
  in_use: { severity: 'error', text: 'Essa conta Google já entra em outra conta do Booksmith. Use outra conta Google.' },
  expired: { severity: 'warn', text: 'O pedido venceu antes de voltar do Google. Tente de novo.' },
  email_not_verified: { severity: 'error', text: 'O e-mail dessa conta Google não está verificado.' },
};

/**
 * Cartão "Entrar com Google" no perfil: mostra se a conta está ligada (e a qual conta Google), liga pelo Google
 * (vale para quem se cadastrou com e-mail e senha, mesmo com outra conta Google) e desliga (só com senha).
 */
@Component({
  selector: 'app-google-account',
  imports: [ButtonModule, ConfirmDialogModule, MessageModule],
  providers: [ConfirmationService],
  template: `
    <section class="glass-card google-account" data-google-account>
      <div class="head">
        <i class="pi pi-google" aria-hidden="true"></i>
        <div>
          <h3>Entrar com Google</h3>
          @if (user().googleLinked) {
            <p class="muted small" data-google-status>
              Ligado{{ user().googleEmail ? ' à conta ' + user().googleEmail : '' }}
            </p>
          } @else {
            <p class="muted small" data-google-status>Não ligado. Ligue para entrar com um toque, sem senha.</p>
          }
        </div>
      </div>

      @if (result(); as r) {
        <p-message [severity]="r.severity" [text]="r.text" styleClass="block-message" data-google-result />
      }
      @if (error(); as text) {
        <p-message severity="error" [text]="text" styleClass="block-message" />
      }

      @if (user().googleLinked) {
        @if (user().hasPassword) {
          <p-button label="Desligar do Google" severity="secondary" [outlined]="true" [loading]="busy()"
            (onClick)="confirmUnlink()" />
        } @else {
          <p class="muted small">Sua conta só entra pelo Google. Para poder desligar, crie uma senha em
            "Esqueceu a senha?" na tela de entrar.</p>
        }
      } @else {
        <p-button label="Ligar ao Google" icon="pi pi-google" [loading]="busy()" (onClick)="link()" />
      }
    </section>
    <p-confirmdialog [style]="{ width: 'min(420px, calc(100vw - 32px))' }" />
  `,
  styles: `
    .google-account { display: flex; flex-direction: column; gap: .75rem; padding: 1rem; margin-bottom: 1rem; }
    .head { display: flex; gap: .75rem; align-items: flex-start; }
    .head .pi { font-size: 1.3rem; margin-top: .2rem; color: var(--bs-ember); }
    h3 { margin: 0; }
    p { margin: .2rem 0 0; overflow-wrap: anywhere; }
    p-button { align-self: flex-start; }
  `,
})
export class GoogleAccountComponent {
  private readonly api = inject(ProfileApi);
  private readonly confirm = inject(ConfirmationService);

  readonly user = input.required<Profile['user']>();
  /** ?google= da volta do Google */
  readonly outcome = input<string | undefined>();
  readonly changed = output<void>();

  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly result = computed(() => {
    const code = this.outcome();
    return code ? (LINK_RESULTS[code] ?? LINK_RESULTS['expired']) : null;
  });

  /** Pede o tíquete e vai ao Google; a volta cai em /profile?google=... */
  async link(): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      const { ticket } = await firstValueFrom(this.api.startGoogleLink());
      window.location.href = `${environment.authBaseUrl}/oauth2/authorization/google?link=${encodeURIComponent(ticket)}`;
    } catch (error) {
      this.error.set(problemMessage(error, 'Não foi possível ligar ao Google.'));
      this.busy.set(false);
    }
  }

  confirmUnlink(): void {
    this.confirm.confirm({
      header: 'Desligar do Google?',
      message: 'Você vai entrar só com e-mail e senha. Dá para ligar de novo quando quiser.',
      acceptLabel: 'Desligar',
      rejectLabel: 'Cancelar',
      accept: () => void this.unlink(),
    });
  }

  private async unlink(): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      await firstValueFrom(this.api.unlinkGoogle());
      this.changed.emit();
    } catch (error) {
      this.error.set(problemMessage(error, 'Não foi possível desligar do Google.'));
    } finally {
      this.busy.set(false);
    }
  }
}
