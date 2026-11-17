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
import { BookDetail, ImportDivision, ImportMode, ImportPlan, ImportStructure, OutlineItem } from '../../../core/models/api.models';
import { formatCount } from '../../../core/util/word-count';
import {
  CONFIDENCE_LABEL,
  DIVISION_KINDS,
  OUTLINE_KINDS,
  chapterCount,
  editableOutline,
  emptyChapters,
  toRequest,
} from './import-structure';

/** Mesmo limite da API para arquivos de texto. */
const MAX_BYTES = 15 * 1024 * 1024;
/** O livro pronto em PDF vai até 100 MB. */
export const MAX_PDF_BYTES = 100 * 1024 * 1024;

export function isPdf(fileName: string): boolean {
  return fileName.toLowerCase().endsWith('.pdf');
}

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
    return null; // o livro pronto: cada página vira uma página do livro (outro caminho, em choose)
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
  STRUCTURED: 'Com a estrutura que você aprovou.',
  OUTLINE: 'Pelo sumário.',
};

/**
 * Importar um arquivo (.docx, .odt, .md, .txt): escolher o arquivo, revisar a estrutura que o Booksmith encontrou
 * (partes, capítulos, páginas sem número, subcapítulos e o sumário do arquivo), corrigir o que precisar e aprovar.
 * Os capítulos entram no fim do livro; nada do que já existe muda. Ainda dá para importar tudo num capítulo só.
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
  /** A estrutura proposta, que o escritor revisa: tipos e títulos editáveis. */
  readonly structure = signal<ImportStructure | null>(null);
  readonly divisions = signal<ImportDivision[]>([]);
  readonly outlineItems = signal<OutlineItem[]>([]);
  readonly useOutline = signal(true);
  readonly showOutline = signal(false);
  readonly divisionKinds = DIVISION_KINDS;
  readonly outlineKinds = OUTLINE_KINDS;
  readonly confidenceLabel = CONFIDENCE_LABEL;
  readonly approvedCount = computed(() => chapterCount(this.divisions(), this.outlineItems(), this.useOutline()));
  readonly emptyCount = computed(() => (this.useOutline() ? emptyChapters(this.outlineItems()) : 0));
  readonly approveLabel = computed(() => {
    const n = this.approvedCount();
    return n === 1 ? 'Aprovar e criar 1 capítulo' : `Aprovar e criar ${n} capítulos`;
  });
  /** Divisão encontrada no modo automático, para saber se vale oferecer a escolha. */
  readonly autoChapters = signal(0);
  readonly loading = signal(false);
  readonly importing = signal(false);
  readonly error = signal<string | null>(null);
  readonly dragging = signal(false);

  readonly formatCount = formatCount;
  readonly accept = [...ACCEPTED, '.pdf'].join(',');
  /** O livro pronto em PDF escolhido, esperando a confirmação. */
  readonly pdf = signal<File | null>(null);
  readonly importingPdf = signal(false);
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
    if (isPdf(file.name)) {
      if (file.size > MAX_PDF_BYTES) {
        this.error.set('O PDF é grande demais. O limite é de 100 MB.');
        return;
      }
      this.pdf.set(file);
      return;
    }
    if (file.size > MAX_BYTES) {
      this.error.set('O arquivo é grande demais. O limite é de 15 MB.');
      return;
    }
    this.file.set(file);
    this.mode.set('auto');
    await this.analyze();
  }

  /** O livro pronto em PDF: cada página vira uma página do livro, com a página como imagem de fundo. */
  async importPdf(): Promise<void> {
    const file = this.pdf();
    if (!file) {
      return;
    }
    this.importingPdf.set(true);
    this.error.set(null);
    try {
      const result = await firstValueFrom(this.api.importPdf(this.bookId(), file));
      this.toast.add({
        severity: 'success',
        summary: result.pages === 1 ? '1 página importada' : `${result.pages} páginas importadas`,
        detail: result.spreads ? `${result.spreads} delas são páginas duplas.` : undefined,
        life: 5000,
      });
      await this.router.navigate(['/books', this.bookId()]);
    } catch (error) {
      this.error.set(problemMessage(error, 'Não foi possível importar o PDF. Seu livro não foi alterado.'));
    } finally {
      this.importingPdf.set(false);
    }
  }

  /** Lê a estrutura do arquivo para o escritor revisar. */
  async analyze(): Promise<void> {
    const file = this.file();
    if (!file) {
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    try {
      const structure = await firstValueFrom(this.api.analyzeImport(this.bookId(), file));
      this.structure.set(structure);
      this.divisions.set(structure.divisions.map((d) => ({ ...d })));
      this.outlineItems.set(editableOutline(structure));
      this.useOutline.set(!!structure.outline);
      this.showOutline.set(false);
    } catch (error) {
      this.structure.set(null);
      this.error.set(problemMessage(error, 'Não foi possível ler o arquivo.'));
    } finally {
      this.loading.set(false);
    }
  }

  setDivision(index: number, change: Partial<ImportDivision>): void {
    this.divisions.update((list) => list.map((d) => (d.index === index ? { ...d, ...change } : d)));
  }

  setOutline(position: number, change: Partial<OutlineItem>): void {
    this.outlineItems.update((list) => list.map((item, i) => (i === position ? { ...item, ...change } : item)));
  }

  /** Aprova a estrutura revisada e cria os capítulos. */
  async approve(): Promise<void> {
    const file = this.file();
    if (!file) {
      return;
    }
    this.importing.set(true);
    try {
      const request = toRequest(this.divisions(), this.outlineItems(), this.useOutline());
      const result = await firstValueFrom(this.api.importStructured(this.bookId(), file, request));
      this.done(result);
      await this.router.navigate(['/books', this.bookId()]);
    } catch (error) {
      this.error.set(problemMessage(error, 'Não foi possível importar. Seu livro não foi alterado.'));
    } finally {
      this.importing.set(false);
    }
  }

  /** Sem divisões: tudo num capítulo só (o caminho antigo, ainda útil para contos e textos curtos). */
  async importSingle(): Promise<void> {
    this.mode.set('single');
    await this.preview();
  }

  private done(result: ImportPlan): void {
    const count = result.chapters.length;
    this.toast.add({
      severity: 'success',
      summary: count === 1 ? '1 capítulo criado' : `${count} capítulos criados`,
      detail: `${formatCount(result.totalWords)} palavras no fim do livro.`,
      life: 4000,
    });
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
      this.done(result);
      await this.router.navigate(['/books', this.bookId()]);
    } catch (error) {
      this.error.set(problemMessage(error, 'Não foi possível importar. Seu livro não foi alterado.'));
    } finally {
      this.importing.set(false);
    }
  }

  reset(): void {
    this.pdf.set(null);
    this.file.set(null);
    this.plan.set(null);
    this.structure.set(null);
    this.divisions.set([]);
    this.outlineItems.set([]);
    this.error.set(null);
    this.mode.set('auto');
  }

  /** Volta da prévia "um capítulo só" para a revisão da estrutura. */
  backToStructure(): void {
    this.plan.set(null);
    this.mode.set('auto');
  }
}
