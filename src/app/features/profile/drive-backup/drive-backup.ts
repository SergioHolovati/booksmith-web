import { Component, computed, inject, input, signal } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageModule } from 'primeng/message';
import { firstValueFrom } from 'rxjs';

import { DriveApi } from '../../../core/api/drive.api';
import { problemMessage } from '../../../core/api/problem';
import { DriveStatus } from '../../../core/models/api.models';

/** O que a volta do Google ({@code /profile?drive=}) quer dizer. */
export const DRIVE_RESULTS: Record<string, { severity: 'success' | 'warn' | 'error'; text: string }> = {
  connected: { severity: 'success', text: 'Google Drive ligado. Toque em "Fazer backup agora" para a primeira cópia.' },
  denied: { severity: 'warn', text: 'Você não autorizou o Google Drive. Nada foi ligado.' },
  expired: { severity: 'warn', text: 'O pedido venceu antes de voltar do Google. Tente de novo.' },
  error: { severity: 'error', text: 'Não foi possível ligar o Google Drive. Tente de novo em alguns minutos.' },
};

/** "12/11/2026 às 20:30". */
export function whenText(iso: string): string {
  const date = new Date(iso);
  const day = date.toLocaleDateString('pt-BR');
  const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${day} às ${time}`;
}

/**
 * Cartão "Backup no Google Drive" no perfil: liga o Drive (o Booksmith só vê os arquivos que ele mesmo cria),
 * faz o backup na hora e mostra o último. Toda madrugada sai um backup sozinho.
 */
@Component({
  selector: 'app-drive-backup',
  imports: [ButtonModule, ConfirmDialogModule, MessageModule],
  providers: [ConfirmationService],
  template: `
    <section class="glass-card drive" data-drive>
      <div class="head">
        <i class="pi pi-cloud-upload" aria-hidden="true"></i>
        <div>
          <h3>Backup no Google Drive</h3>
          @if (status(); as s) {
            @if (s.connected) {
              <p class="muted small" data-drive-status>
                Ligado{{ s.googleEmail ? ' a ' + s.googleEmail : '' }}.
                @if (s.lastBackupAt) {
                  Último backup em {{ when(s.lastBackupAt) }} ({{ s.books === 1 ? '1 livro' : s.books + ' livros' }}).
                } @else {
                  Ainda sem backup.
                }
              </p>
            } @else {
              <p class="muted small" data-drive-status>
                Uma cópia de cada livro em Word, na pasta "Booksmith" do seu Drive, todo dia de madrugada.
              </p>
            }
          }
        </div>
      </div>

      @if (result(); as r) {
        <p-message [severity]="r.severity" [text]="r.text" styleClass="block-message" data-drive-result />
      }
      @if (status()?.lastError; as text) {
        <p-message severity="warn" [text]="text" styleClass="block-message" />
      }
      @if (error(); as text) {
        <p-message severity="error" [text]="text" styleClass="block-message" />
      }

      @if (status(); as s) {
        @if (s.connected) {
          <div class="actions">
            <p-button label="Fazer backup agora" icon="pi pi-cloud-upload" [loading]="busy()" (onClick)="backup()" />
            <p-button label="Desligar" severity="secondary" [text]="true" (onClick)="confirmDisconnect()" />
          </div>
        } @else {
          <p class="muted small">O Booksmith só vê os arquivos que ele mesmo cria no seu Drive, nunca o resto.</p>
          <p-button label="Ligar o Google Drive" icon="pi pi-google" [loading]="busy()" (onClick)="connect()" />
        }
      }
    </section>
    <p-confirmdialog [style]="{ width: 'min(420px, calc(100vw - 32px))' }" />
  `,
  styles: `
    .drive { display: flex; flex-direction: column; gap: .75rem; padding: 1rem; margin-bottom: 1rem; }
    .head { display: flex; gap: .75rem; align-items: flex-start; }
    .head .pi { font-size: 1.3rem; margin-top: .2rem; color: var(--bs-ember); }
    h3 { margin: 0; }
    p { margin: .2rem 0 0; overflow-wrap: anywhere; }
    .actions { display: flex; flex-wrap: wrap; gap: .5rem; }
    p-button { align-self: flex-start; }
  `,
})
export class DriveBackupComponent {
  private readonly api = inject(DriveApi);
  private readonly confirm = inject(ConfirmationService);
  private readonly toast = inject(MessageService);

  /** ?drive= da volta do Google */
  readonly outcome = input<string | undefined>();

  readonly status = signal<DriveStatus | null>(null);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly when = whenText;
  readonly result = computed(() => {
    const code = this.outcome();
    return code ? (DRIVE_RESULTS[code] ?? DRIVE_RESULTS['error']) : null;
  });

  constructor() {
    void this.load();
  }

  async load(): Promise<void> {
    try {
      this.status.set(await firstValueFrom(this.api.status()));
    } catch (error) {
      this.error.set(problemMessage(error, 'Não foi possível carregar o backup.'));
    }
  }

  async connect(): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      const { url } = await firstValueFrom(this.api.connect());
      window.location.href = url;
    } catch (error) {
      this.error.set(problemMessage(error, 'Não foi possível ligar o Google Drive.'));
      this.busy.set(false);
    }
  }

  async backup(): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      const done = await firstValueFrom(this.api.backup());
      this.toast.add({
        severity: 'success',
        summary: 'Backup feito',
        detail: done.books === 1 ? '1 livro salvo no seu Drive.' : `${done.books} livros salvos no seu Drive.`,
      });
    } catch (error) {
      this.error.set(problemMessage(error, 'O backup não saiu. Tente de novo.'));
    } finally {
      await this.load();
      this.busy.set(false);
    }
  }

  confirmDisconnect(): void {
    this.confirm.confirm({
      header: 'Desligar o backup?',
      message: 'O Booksmith para de salvar no seu Drive. Os arquivos que já estão lá continuam com você.',
      acceptLabel: 'Desligar',
      rejectLabel: 'Cancelar',
      accept: () => void this.disconnect(),
    });
  }

  private async disconnect(): Promise<void> {
    this.busy.set(true);
    try {
      await firstValueFrom(this.api.disconnect());
      await this.load();
    } catch (error) {
      this.error.set(problemMessage(error, 'Não foi possível desligar.'));
    } finally {
      this.busy.set(false);
    }
  }
}
