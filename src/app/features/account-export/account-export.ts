import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { firstValueFrom } from 'rxjs';

import { ExportApi, ExportedFile } from '../../core/api/export.api';
import { problemMessage } from '../../core/api/problem';
import { formatSize, saveFile } from '../../core/util/save-file';

/**
 * "Baixar tudo" (`/meus-dados`): um .zip com tudo o que a pessoa tem no Booksmith. Serve de cópia de segurança e
 * atende o pedido de cópia dos dados (LGPD). Gera primeiro e salva num segundo toque (exigência do iPhone).
 */
@Component({
  selector: 'app-account-export',
  imports: [RouterLink, ButtonModule],
  template: `
    <div class="page narrow">
      <a routerLink="/profile" class="back-link"><i class="pi pi-arrow-left"></i> Perfil</a>
      <div class="page-header">
        <div>
          <h1 class="page-title">Baixar tudo</h1>
          <p class="page-subtitle">Uma cópia de tudo o que você tem no Booksmith, num arquivo .zip. Guarde num lugar
            seguro: é o seu livro inteiro.</p>
        </div>
      </div>

      <section class="glass-card contents" aria-label="O que vai no arquivo">
        <ul>
          <li><i class="pi pi-book" aria-hidden="true"></i><span><strong>Livros:</strong> cada um em Word, pronto para
            abrir, e também só o texto e os dados completos, com a capa.</span></li>
          <li><i class="pi pi-globe" aria-hidden="true"></i><span><strong>Universos:</strong> personagens, lugares,
            religiões e governos, linha do tempo, relações, mapa e imagens.</span></li>
          <li><i class="pi pi-user" aria-hidden="true"></i><span><strong>Conta:</strong> seu cadastro e o perfil de
            autor.</span></li>
          <li><i class="pi pi-comments" aria-hidden="true"></i><span><strong>Suporte:</strong> os pedidos que você
            mandou.</span></li>
        </ul>
        <p class="muted small">Não entram o que está na lixeira, o histórico de versões e dados de segurança (senha e
          sessões).</p>
      </section>

      @if (file(); as ready) {
        <div class="glass-card ready" aria-live="polite">
          <i class="pi pi-check-circle" aria-hidden="true"></i>
          <span><strong>{{ ready.filename }}</strong><small class="muted">{{ size(ready) }}</small></span>
          <p-button label="Salvar arquivo" icon="pi pi-download" (onClick)="save(ready)" />
        </div>
      } @else {
        <p-button label="Gerar meu arquivo" icon="pi pi-box" [loading]="generating()" (onClick)="generate()" />
        @if (generating()) {
          <p class="muted small">Juntando tudo. Com muitas imagens, pode levar alguns segundos.</p>
        }
        @if (error(); as message) {
          <p class="error small" role="alert">{{ message }}</p>
        }
      }
    </div>
  `,
  styles: `
    .contents { padding: 1rem; margin-bottom: 1.25rem; }
    .contents ul { list-style: none; margin: 0 0 .75rem; padding: 0; display: flex; flex-direction: column; gap: .75rem; }
    .contents li { display: flex; gap: .75rem; align-items: flex-start; }
    .contents li i { color: var(--bs-ember); margin-top: .2rem; }
    .contents p { margin: 0; }
    .ready { display: flex; align-items: center; gap: .75rem; flex-wrap: wrap; padding: .85rem 1rem; }
    .ready > i { color: var(--bs-success); font-size: 1.4rem; }
    .ready span { flex: 1; min-width: 0; display: flex; flex-direction: column; overflow-wrap: anywhere; }
    .error { color: var(--bs-danger); }
  `,
})
export class AccountExportComponent {
  private readonly api = inject(ExportApi);

  readonly generating = signal(false);
  readonly file = signal<ExportedFile | null>(null);
  readonly error = signal<string | null>(null);

  async generate(): Promise<void> {
    this.generating.set(true);
    this.error.set(null);
    try {
      this.file.set(await firstValueFrom(this.api.downloadEverything()));
    } catch (error) {
      this.error.set(problemMessage(error, 'Não foi possível gerar o arquivo. Tente de novo.'));
    } finally {
      this.generating.set(false);
    }
  }

  save(file: ExportedFile): void {
    saveFile(file);
  }

  size(file: ExportedFile): string {
    return formatSize(file.blob.size);
  }
}
