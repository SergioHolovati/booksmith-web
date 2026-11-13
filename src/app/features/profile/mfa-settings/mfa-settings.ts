import { Component, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import qrcode from 'qrcode-generator';
import { firstValueFrom } from 'rxjs';

import { MfaApi } from '../../../core/api/mfa.api';
import { problemMessage } from '../../../core/api/problem';
import { MfaMethod, MfaStatus } from '../../../core/models/api.models';

type Step = 'idle' | 'totp' | 'email' | 'codes' | 'regenerate' | 'disable';

export const METHOD_LABEL: Record<MfaMethod, string> = {
  totp: 'App autenticador',
  email: 'Código por e-mail',
};

/** QR code do link otpauth:// como imagem (data URL), para ler com o app autenticador. */
export function qrDataUrl(text: string): string {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  return qr.createDataURL(5, 2);
}

/** O segredo em grupos de 4, mais fácil de digitar: "ABCD EFGH ...". */
export function groupSecret(secret: string): string {
  return secret.replace(/(.{4})/g, '$1 ').trim();
}

/** O arquivo .txt dos códigos de recuperação. */
export function recoveryText(codes: string[], email: string): string {
  return ['Booksmith: códigos de recuperação da verificação em duas etapas', `Conta: ${email}`, '',
    'Cada código vale uma vez. Guarde num lugar seguro, fora do celular.', '', ...codes, ''].join('\n');
}

/**
 * Cartão "Verificação em duas etapas" (no perfil e na tela de ativar, obrigatória): ligar o app autenticador (QR code) ou o código por
 * e-mail, guardar os códigos de recuperação, gerar novos e desligar (com a senha e um código; só quando não é
 * obrigatória).
 */
@Component({
  selector: 'app-mfa-settings',
  imports: [FormsModule, ButtonModule, InputTextModule, MessageModule],
  templateUrl: './mfa-settings.html',
  styleUrl: './mfa-settings.scss',
})
export class MfaSettingsComponent {
  private readonly api = inject(MfaApi);
  private readonly toast = inject(MessageService);

  readonly email = input.required<string>();
  readonly hasPassword = input.required<boolean>();
  /** Um método acabou de ser ativado (e os códigos de recuperação, se vieram, foram guardados). */
  readonly activated = output<void>();

  readonly labels = METHOD_LABEL;
  readonly status = signal<MfaStatus | null>(null);
  readonly step = signal<Step>('idle');
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly qr = signal<string | null>(null);
  readonly secret = signal<string | null>(null);
  readonly uri = signal<string | null>(null);
  readonly codes = signal<string[]>([]);
  readonly saved = signal(false);
  code = '';
  password = '';

  constructor() {
    void this.load();
  }

  async load(): Promise<void> {
    try {
      this.status.set(await firstValueFrom(this.api.status()));
    } catch (error) {
      this.error.set(problemMessage(error, 'Não foi possível carregar a verificação em duas etapas.'));
    }
  }

  has(method: MfaMethod): boolean {
    return this.status()?.methods.includes(method) ?? false;
  }

  async startTotp(): Promise<void> {
    await this.run(async () => {
      const setup = await firstValueFrom(this.api.startTotp());
      this.secret.set(groupSecret(setup.secret));
      this.uri.set(setup.uri);
      this.qr.set(qrDataUrl(setup.uri));
      this.go('totp');
    });
  }

  async startEmail(): Promise<void> {
    await this.run(async () => {
      await firstValueFrom(this.api.startEmail());
      this.toast.add({ severity: 'info', summary: 'Código enviado', detail: `Confira ${this.email()}.` });
      this.go('email');
    });
  }

  async confirm(method: MfaMethod): Promise<void> {
    await this.run(async () => {
      const { recoveryCodes } = await firstValueFrom(this.api.confirm(method, this.code.trim()));
      await this.load();
      this.toast.add({ severity: 'success', summary: 'Verificação em duas etapas ativada' });
      if (recoveryCodes.length) {
        this.showCodes(recoveryCodes);
      } else {
        this.go('idle');
        this.activated.emit();
      }
    });
  }

  /** Código por e-mail para confirmar uma ação (quem tem o método por e-mail). */
  async sendCode(): Promise<void> {
    await this.run(async () => {
      await firstValueFrom(this.api.sendCode());
      this.toast.add({ severity: 'info', summary: 'Código enviado', detail: `Confira ${this.email()}.` });
    });
  }

  async regenerate(): Promise<void> {
    await this.run(async () => {
      const { recoveryCodes } = await firstValueFrom(this.api.regenerateRecoveryCodes(this.code.trim()));
      await this.load();
      this.showCodes(recoveryCodes);
    });
  }

  async disable(): Promise<void> {
    await this.run(async () => {
      await firstValueFrom(this.api.disable(this.hasPassword() ? this.password : null, this.code.trim()));
      await this.load();
      this.toast.add({ severity: 'success', summary: 'Verificação em duas etapas desativada' });
      this.go('idle');
    });
  }

  copyCodes(): void {
    void navigator.clipboard?.writeText(this.codes().join('\n'));
    this.toast.add({ severity: 'success', summary: 'Códigos copiados' });
  }

  downloadCodes(): void {
    const blob = new Blob([recoveryText(this.codes(), this.email())], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'booksmith-codigos-de-recuperacao.txt';
    link.click();
    URL.revokeObjectURL(link.href);
  }

  /** Fecha a tela dos códigos (eles não aparecem de novo). */
  finish(): void {
    this.codes.set([]);
    this.go('idle');
    this.activated.emit();
  }

  go(step: Step): void {
    this.step.set(step);
    this.code = '';
    this.password = '';
    this.error.set(null);
    if (step === 'idle') {
      this.qr.set(null);
      this.secret.set(null);
      this.uri.set(null);
    }
  }

  private showCodes(codes: string[]): void {
    this.codes.set(codes);
    this.saved.set(false);
    this.go('codes');
  }

  private async run(action: () => Promise<void>): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      await action();
    } catch (error) {
      this.error.set(problemMessage(error, 'Não foi possível concluir.'));
    } finally {
      this.busy.set(false);
    }
  }
}
