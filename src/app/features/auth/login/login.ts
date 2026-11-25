import { Component, ElementRef, OnDestroy, inject, input, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';

import { problemMessage, problemOf } from '../../../core/api/problem';
import { AuthService } from '../../../core/auth/auth.service';
import { mfaState } from '../mfa-challenge/mfa-challenge';
import { renderTurnstile } from '../../../core/auth/turnstile';

const GOOGLE_ERRORS: Record<string, string> = {
  google: 'Não foi possível entrar com o Google. Tente novamente.',
  google_email_not_verified: 'Seu e-mail do Google não está verificado.',
  google_invite_required:
    'Não há conta do Booksmith com este Google. Para criar uma, toque em "Criar conta" e use seu código de convite.',
  google_account_exists:
    'Já existe uma conta com este e-mail. Entre com sua senha e, no Perfil, toque em "Ligar ao Google" para entrar com o Google das próximas vezes.',
};

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink, ButtonModule, InputTextModule, MessageModule],
  templateUrl: './login.html',
  styleUrl: '../auth-page.scss',
})
export class LoginComponent implements OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  /** ?error= vindo do fluxo do Google */
  readonly error = input<string>();
  /** ?email= vindo da confirmação do e-mail */
  readonly email = input<string>();

  address = '';
  password = '';
  readonly loading = signal(false);
  readonly message = signal<string | null>(null);
  /** Depois de 3 senhas erradas, o servidor pede o desafio anti-robô: a chave dele, e o token quando passa. */
  readonly captchaSiteKey = signal<string | null>(null);
  readonly captchaToken = signal<string | null>(null);
  private readonly captchaBox = viewChild<ElementRef<HTMLElement>>('captcha');
  private captchaWidget: { reset: () => void; remove: () => void } | null = null;

  constructor() {
    queueMicrotask(() => {
      this.address = this.email() ?? '';
    });
  }

  googleError(): string | null {
    const code = this.error();
    return code ? (GOOGLE_ERRORS[code] ?? GOOGLE_ERRORS['google']) : null;
  }

  async loginWithForm(): Promise<void> {
    this.message.set(null);
    this.loading.set(true);
    try {
      await this.auth.login(this.address.trim(), this.password, this.captchaToken() ?? undefined);
      await this.router.navigate(['/home']);
    } catch (error) {
      const problem = problemOf(error);
      // O token do desafio vale uma vez só: a próxima tentativa resolve outro
      this.captchaToken.set(null);
      this.captchaWidget?.reset();
      if (problem?.code === 'captcha_required' && problem.siteKey) {
        this.message.set(problem.detail ?? null);
        await this.showCaptcha(problem.siteKey);
        return;
      }
      if (problem?.code === 'mfa_required') {
        // Senha certa e verificação em duas etapas ligada: a tela do código
        await this.router.navigate(['/verificacao'], { state: mfaState(problem) });
        return;
      }
      if (problem?.code === 'email_not_verified') {
        // Senha certa, e-mail sem confirmar: leva para a tela do código e pede um novo
        await this.router.navigate(['/verificar-email'], { queryParams: { email: this.address.trim(), sent: '0' } });
        return;
      }
      this.message.set(problemMessage(error, 'Não foi possível entrar.'));
    } finally {
      this.loading.set(false);
    }
  }

  private async showCaptcha(siteKey: string): Promise<void> {
    if (this.captchaSiteKey() === siteKey && this.captchaWidget) {
      return;
    }
    this.captchaSiteKey.set(siteKey);
    // Espera o quadro do desafio aparecer na tela
    await new Promise((resolve) => setTimeout(resolve));
    const box = this.captchaBox()?.nativeElement;
    if (!box) {
      return;
    }
    try {
      this.captchaWidget = await renderTurnstile(box, siteKey, (token) => this.captchaToken.set(token));
    } catch {
      this.message.set('Não foi possível carregar a verificação de segurança. Confira a internet e tente de novo.');
    }
  }

  ngOnDestroy(): void {
    this.captchaWidget?.remove();
  }

  loginWithGoogle(): void {
    this.auth.loginWithGoogle();
  }
}
