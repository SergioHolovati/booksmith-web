import { Component, inject, signal } from '@angular/core';
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

  readonly loading = signal(false);
  readonly message = signal<string | null>(null);
  readonly today = new Date().toISOString().slice(0, 10);

  readonly form = inject(FormBuilder).nonNullable.group(
    {
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: [''],
      email: ['', [Validators.required, Validators.email]],
      birthDate: ['', Validators.required],
      password: ['', [Validators.required, Validators.pattern(PASSWORD_PATTERN)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordsMatch },
  );

  private readonly passwordValue = toSignal(this.form.controls.password.valueChanges, { initialValue: '' });
  readonly checks = () => passwordChecks(this.passwordValue());

  showError(control: keyof typeof this.form.controls): boolean {
    const c = this.form.controls[control];
    return c.invalid && c.touched;
  }

  get passwordsDoNotMatch(): boolean {
    return this.form.hasError('passwordMismatch') && this.form.controls.confirmPassword.touched;
  }

  async register(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { firstName, lastName, email, birthDate, password } = this.form.getRawValue();
    this.loading.set(true);
    this.message.set(null);
    try {
      await this.auth.register({
        firstName: firstName.trim(),
        lastName: lastName.trim() || null,
        email: email.trim(),
        birthDate,
        password,
      });
      this.toast.add({ severity: 'success', summary: 'Conta criada', detail: 'Entre para começar a escrever.' });
      await this.router.navigate(['/login']);
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
