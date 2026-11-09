import { Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';

import { problemMessage } from '../../../core/api/problem';
import { AuthService } from '../../../core/auth/auth.service';

const GOOGLE_ERRORS: Record<string, string> = {
  google: 'Não foi possível entrar com o Google. Tente novamente.',
  google_email_not_verified: 'Seu e-mail do Google não está verificado.',
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

  email = '';
  password = '';
  readonly loading = signal(false);
  readonly message = signal<string | null>(null);

  googleError(): string | null {
    const code = this.error();
    return code ? (GOOGLE_ERRORS[code] ?? GOOGLE_ERRORS['google']) : null;
  }

  async loginWithForm(): Promise<void> {
    this.message.set(null);
    this.loading.set(true);
    try {
      await this.auth.login(this.email.trim(), this.password);
      await this.router.navigate(['/home']);
    } catch (error) {
      this.message.set(problemMessage(error, 'Não foi possível entrar.'));
    } finally {
      this.loading.set(false);
    }
  }

  loginWithGoogle(): void {
    this.auth.loginWithGoogle();
  }
}
