import { Component, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';

import { problemMessage } from '../../../core/api/problem';
import { AuthService } from '../../../core/auth/auth.service';
import { PASSWORD_PATTERN, passwordChecks } from '../password-rules';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink, ButtonModule, InputTextModule, MessageModule],
  templateUrl: './register.html',
  styleUrl: '../auth-page.scss',
})
export class RegisterComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(MessageService);

  /** ?convite= do link que o convidado recebeu */
  readonly convite = input<string>();

  readonly loading = signal(false);
  readonly googleLoading = signal(false);
  readonly message = signal<string | null>(null);
  /** Beta fechado: o convite é obrigatório (vem do servidor). */
  readonly inviteRequired = signal(true);
  readonly today = new Date().toISOString().slice(0, 10);

  readonly form = inject(FormBuilder).nonNullable.group(
    {
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: [''],
      email: ['', [Validators.required, Validators.email]],
      birthDate: ['', Validators.required],
      password: ['', [Validators.required, Validators.pattern(PASSWORD_PATTERN)]],
      confirmPassword: ['', Validators.required],
      inviteCode: [''],
      acceptTerms: [false, Validators.requiredTrue],
    },
    { validators: passwordsMatch },
  );

  private readonly passwordValue = toSignal(this.form.controls.password.valueChanges, { initialValue: '' });
  readonly checks = () => passwordChecks(this.passwordValue());

  constructor() {
    queueMicrotask(() => {
      const code = this.convite();
      if (code) {
        this.form.controls.inviteCode.setValue(code);
      }
    });
    void this.auth.config().then((config) => this.inviteRequired.set(config.inviteRequired)).catch(() => undefined);
  }

  /** Beta fechado sem código: avisa antes de qualquer coisa. */
  private missingInvite(): boolean {
    if (this.inviteRequired() && !this.form.controls.inviteCode.value.trim()) {
      this.message.set('O Booksmith está em beta fechado: digite o código de convite que você recebeu.');
      return true;
    }
    return false;
  }

  /** Criar a conta pelo Google: confere o convite e vai ao Google com ele. */
  async registerWithGoogle(): Promise<void> {
    this.message.set(null);
    if (this.missingInvite()) {
      return;
    }
    const code = this.form.controls.inviteCode.value.trim();
    this.googleLoading.set(true);
    try {
      if (code && !(await this.auth.inviteValid(code))) {
        this.message.set('Código de convite inválido, vencido ou já usado.');
        this.googleLoading.set(false);
        return;
      }
      this.auth.loginWithGoogle(code || undefined);
    } catch (error) {
      this.message.set(problemMessage(error, 'Não foi possível conferir o convite.'));
      this.googleLoading.set(false);
    }
  }

  showError(control: keyof typeof this.form.controls): boolean {
    const c = this.form.controls[control];
    return c.invalid && c.touched;
  }

  get passwordsDoNotMatch(): boolean {
    return this.form.hasError('passwordMismatch') && this.form.controls.confirmPassword.touched;
  }

  async register(): Promise<void> {
    this.message.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.missingInvite()) {
      return;
    }

    const { firstName, lastName, email, birthDate, password, inviteCode, acceptTerms } = this.form.getRawValue();
    this.loading.set(true);
    this.message.set(null);
    try {
      await this.auth.register({
        firstName: firstName.trim(),
        lastName: lastName.trim() || null,
        email: email.trim(),
        birthDate,
        password,
        inviteCode: inviteCode.trim() || null,
        acceptTerms,
      });
      this.toast.add({ severity: 'success', summary: 'Conta criada', detail: 'Falta confirmar o e-mail.' });
      await this.router.navigate(['/verificar-email'], { queryParams: { email: email.trim() } });
    } catch (error) {
      this.message.set(problemMessage(error, 'Não foi possível criar a conta.'));
    } finally {
      this.loading.set(false);
    }
  }
}

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  return group.get('password')?.value === group.get('confirmPassword')?.value ? null : { passwordMismatch: true };
}
