import { Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SelectButtonModule } from 'primeng/selectbutton';
import { firstValueFrom } from 'rxjs';

import { ManuscriptApi } from '../../../core/api/manuscript.api';
import { problemMessage } from '../../../core/api/problem';
import { BookDetail, ImportMode, ImportPlan } from '../../../core/models/api.models';
import { formatCount } from '../../../core/util/word-count';

/** Mesmo limite da API (spring.servlet.multipart.max-file-size). */
const MAX_BYTES = 15 * 1024 * 1024;

/** Formatos que a API lê; o servidor confere o conteúdo de novo. */
export const ACCEPTED = ['.docx', '.odt', '.md', '.markdown', '.txt'];

/** Por que o arquivo não serve, antes de enviar; `null` quando é um dos formatos aceitos. */
export function rejectReason(fileName: string): string | null {
  const name = fileName.toLowerCase();
  if (ACCEPTED.some((extension) => name.endsWith(extension))) {
    return null;
  }
  if (name.endsWith('.doc')) {
    return 'Este é o formato antigo do Word (.doc). Abra no Word e use "Salvar como" → "Documento do Word (.docx)".';
  }
  if (name.endsWith('.pdf')) {
    return 'PDF não dá para importar: ele guarda páginas, não parágrafos. Se você tem o original, baixe em .docx.';
  }
  if (name.endsWith('.pages')) {
    return 'No Pages, use Arquivo → Exportar para → Word (.docx) e importe o novo arquivo.';
  }
  return 'Escolha um documento do Word (.docx), do LibreOffice (.odt), texto (.txt) ou Markdown (.md).';
}

/** Onde estavam os títulos de capítulo, no vocabulário do programa de onde o arquivo veio. */
export function headingsText(fileName: string | undefined): string {
  const name = (fileName ?? '').toLowerCase();
  if (name.endsWith('.docx')) {
    return 'Separamos pelos títulos do Word.';
  }
  if (name.endsWith('.odt')) {
    return 'Separamos pelos títulos do LibreOffice.';
  }
  if (name.endsWith('.md') || name.endsWith('.markdown')) {
    return 'Separamos pelos títulos do Markdown (#).';
  }
  return 'Separamos pelos títulos do arquivo.';
}

const RULE_TEXT: Record<ImportPlan['splitRule'], string> = {
  HEADINGS: 'Separamos pelos títulos do arquivo.',
  CHAPTER_TITLES: 'Separamos onde o texto diz "Capítulo…", "Prólogo" ou "Epílogo".',
  SINGLE: 'Tudo vai entrar como um capítulo só.',
};

/**
 * Importar um arquivo (.docx, .odt, .md, .txt): escolher o arquivo, ver como ele vai ser dividido e confirmar. Os capítulos entram no
 * fim do livro; nada do que já existe muda.
 */
@Component({
  selector: 'app-file-import',
  imports: [RouterLink, FormsModule, ButtonModule, MessageModule, ProgressSpinnerModule, SelectButtonModule],
  templateUrl: './file-import.html',
  styleUrl: './file-import.scss',
})
export class FileImportComponent {
  private readonly api = inject(ManuscriptApi);
  private readonly router = inject(Router);
  private readonly toast = inject(MessageService);

  readonly bookId = input.required<string>();

  readonly book = signal<BookDetail | null>(null);
  readonly file = signal<File | null>(null);
  readonly mode = signal<ImportMode>('auto');
  readonly plan = signal<ImportPlan | null>(null);
  /** Divisão encontrada no modo automático, para saber se vale oferecer a escolha. */
  readonly autoChapters = signal(0);
  readonly loading = signal(false);
  readonly importing = signal(false);
  readonly error = signal<string | null>(null);
  readonly dragging = signal(false);

  readonly formatCount = formatCount;
  readonly accept = ACCEPTED.join(',');
  readonly modes = [
    { label: 'Em capítulos', value: 'auto' },
    { label: 'Um capítulo só', value: 'single' },
  ];
  readonly ruleText = computed(() => {
    const plan = this.plan();
    if (!plan) {
      return '';
    }
    if (plan.splitRule === 'SINGLE' && this.mode() === 'auto') {
      return 'Não encontramos títulos de capítulo no arquivo, então tudo vai entrar como um capítulo só.';
    }
    return plan.splitRule === 'HEADINGS' ? headingsText(this.file()?.name) : RULE_TEXT[plan.splitRule];
  });
  readonly importLabel = computed(() => {
    const count = this.plan()?.chapters.length ?? 0;
    return count === 1 ? 'Importar 1 capítulo' : `Importar ${count} capítulos`;
  });

  constructor() {
    queueMicrotask(() => void this.loadBook());
  }

  private async loadBook(): Promise<void> {
    try {
      this.book.set(await firstValueFrom(this.api.getBook(this.bookId())));
    } catch (error) {
      this.error.set(problemMessage(error, 'Não foi possível abrir o livro.'));
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // permite escolher o mesmo arquivo de novo
    if (file) {
      void this.choose(file);
    }
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      void this.choose(file);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(true);
  }

  async choose(file: File): Promise<void> {
    this.error.set(null);
    this.plan.set(null);
    const rejected = rejectReason(file.name);
    if (rejected) {
      this.error.set(rejected);
      return;
    }
    if (file.size > MAX_BYTES) {
      this.error.set('O arquivo é grande demais. O limite é de 15 MB.');
      return;
    }
    this.file.set(file);
    this.mode.set('auto');
    await this.preview();
    this.autoChapters.set(this.plan()?.chapters.length ?? 0);
  }

  async changeMode(mode: ImportMode): Promise<void> {
    if (mode && mode !== this.mode()) {
      this.mode.set(mode);
      await this.preview();
    }
  }

  async preview(): Promise<void> {
    const file = this.file();
    if (!file) {
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    try {
      this.plan.set(await firstValueFrom(this.api.importFile(this.bookId(), file, this.mode(), true)));
    } catch (error) {
      this.plan.set(null);
      this.error.set(problemMessage(error, 'Não foi possível ler o arquivo.'));
    } finally {
      this.loading.set(false);
    }
  }

  async confirm(): Promise<void> {
    const file = this.file();
    if (!file) {
      return;
    }
    this.importing.set(true);
    try {
      const result = await firstValueFrom(this.api.importFile(this.bookId(), file, this.mode(), false));
      const count = result.chapters.length;
      this.toast.add({
        severity: 'success',
        summary: count === 1 ? '1 capítulo importado' : `${count} capítulos importados`,
        detail: `${formatCount(result.totalWords)} palavras no fim do livro.`,
        life: 4000,
      });
      await this.router.navigate(['/books', this.bookId()]);
    } catch (error) {
      this.error.set(problemMessage(error, 'Não foi possível importar. Seu livro não foi alterado.'));
    } finally {
      this.importing.set(false);
    }
  }

  reset(): void {
    this.file.set(null);
    this.plan.set(null);
    this.error.set(null);
    this.mode.set('auto');
  }
}
