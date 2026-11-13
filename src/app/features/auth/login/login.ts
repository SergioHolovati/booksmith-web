import { Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';

import { problemMessage, problemOf } from '../../../core/api/problem';
import { AuthService } from '../../../core/auth/auth.service';
import { mfaState } from '../mfa-challenge/mfa-challenge';

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
export class LoginComponent {
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
      await this.auth.login(this.address.trim(), this.password);
      await this.router.navigate(['/home']);
    } catch (error) {
      const problem = problemOf(error);
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

  loginWithGoogle(): void {
    this.auth.loginWithGoogle();
  }
}
