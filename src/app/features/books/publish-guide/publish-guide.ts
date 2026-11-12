import { Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { firstValueFrom } from 'rxjs';

import { ExportApi } from '../../../core/api/export.api';
import { ManuscriptApi } from '../../../core/api/manuscript.api';
import { problemMessage } from '../../../core/api/problem';
import { BookDetail, PrintCheckIllustration, Publishing, PublishingDestination, PublishingStep } from '../../../core/models/api.models';
import { normalizeLayout } from '../book-layout/book-layout';
import {
  DESTINATIONS,
  EMPTY_PUBLISHING,
  GuideItem,
  MAX_KEYWORDS,
  guideSections,
  isbnProblem,
  normalizePublishing,
  progress,
} from './publish-guide-steps';

const STATUS_ICON: Record<GuideItem['status'], string> = {
  ok: 'pi-check-circle',
  todo: 'pi-circle',
  warn: 'pi-exclamation-triangle',
  info: 'pi-info-circle',
};

/**
 * Guia de publicação (`/books/:id/publicar`): para onde o livro vai (KDP, Clube de Autores, UICLAP ou gráfica) e o
 * caminho até lá. O que o app sabe (texto, sinopse, tamanho, páginas, capa) ele confere; o resto (conta, ficha
 * catalográfica, prova, depósito legal) o autor marca. Os ISBNs saem nos créditos do PDF e do ePub.
 */
@Component({
  selector: 'app-publish-guide',
  imports: [RouterLink, FormsModule, AutoCompleteModule, ButtonModule, InputTextModule, MessageModule],
  templateUrl: './publish-guide.html',
  styleUrl: './publish-guide.scss',
})
export class PublishGuideComponent {
  private readonly api = inject(ManuscriptApi);
  private readonly exportApi = inject(ExportApi);
  private readonly toast = inject(MessageService);

  readonly bookId = input.required<string>();

  readonly destinations = DESTINATIONS;
  readonly maxKeywords = MAX_KEYWORDS;
  readonly book = signal<BookDetail | null>(null);
  readonly loadError = signal<string | null>(null);
  readonly publishing = signal<Publishing>(EMPTY_PUBLISHING);
  readonly pages = signal<number | null>(null);
  readonly illustrations = signal<PrintCheckIllustration[] | null>(null);
  readonly saving = signal(false);

  readonly isbnPrint = signal('');
  readonly isbnEbook = signal('');
  readonly printProblem = computed(() => isbnProblem(this.isbnPrint()));
  readonly ebookProblem = computed(() => isbnProblem(this.isbnEbook()));
  readonly isbnChanged = computed(() => {
    const saved = this.publishing();
    return this.isbnPrint().trim() !== (saved.isbnPrint ?? '') || this.isbnEbook().trim() !== (saved.isbnEbook ?? '');
  });

  readonly sections = computed(() => {
    const book = this.book();
    return book ? guideSections(book, this.publishing(), this.pages(), this.illustrations()) : [];
  });
  readonly progress = computed(() => progress(this.sections()));
  readonly site = computed(() => DESTINATIONS.find((d) => d.value === this.publishing().destination) ?? null);

  constructor() {
    queueMicrotask(() => void this.load());
  }

  async load(): Promise<void> {
    this.loadError.set(null);
    try {
      const book = await firstValueFrom(this.api.getBook(this.bookId()));
      const publishing = normalizePublishing(book.publishing);
      this.book.set(book);
      this.publishing.set(publishing);
      this.isbnPrint.set(publishing.isbnPrint ?? '');
      this.isbnEbook.set(publishing.isbnEbook ?? '');
      if (book.kind !== 'FANFIC' && book.chapters.length > 0) {
        void this.countPages(book);
        void this.checkIllustrations(book);
      } else {
        this.illustrations.set([]);
      }
    } catch (error) {
      this.loadError.set(problemMessage(error, 'Não foi possível abrir o livro.'));
    }
  }

  /** As páginas do miolo na diagramação salva (a prévia da primeira página traz o total). */
  private async countPages(book: BookDetail): Promise<void> {
    try {
      const preview = await firstValueFrom(this.exportApi.preview(book.id, normalizeLayout(book.layout), 1, 1));
      this.pages.set(preview.pageCount);
    } catch {
      // sem a contagem, o item fica como "contando"; o resto do guia segue
    }
  }

  /** DPI das ilustrações na diagramação salva. */
  private async checkIllustrations(book: BookDetail): Promise<void> {
    try {
      const check = await firstValueFrom(this.exportApi.printCheck(book.id, normalizeLayout(book.layout)));
      this.illustrations.set(check.illustrations);
    } catch {
      this.illustrations.set([]);
    }
  }

  icon(item: GuideItem): string {
    return STATUS_ICON[item.status];
  }

  chooseDestination(destination: PublishingDestination): void {
    void this.save({ ...this.publishing(), destination });
  }

  toggleStep(step: PublishingStep, done: boolean): void {
    const steps = this.publishing().done.filter((s) => s !== step);
    void this.save({ ...this.publishing(), done: done ? [...steps, step] : steps });
  }

  isDone(step: PublishingStep): boolean {
    return this.publishing().done.includes(step);
  }

  setKeywords(keywords: string[] | null): void {
    const clean = [...new Set((keywords ?? []).map((k) => k.trim()).filter((k) => k))];
    if (clean.length > MAX_KEYWORDS) {
      this.toast.add({ severity: 'warn', summary: `São até ${MAX_KEYWORDS} palavras-chave.` });
      this.publishing.set({ ...this.publishing() });
      return;
    }
    void this.save({ ...this.publishing(), keywords: clean });
  }

  saveIsbn(): void {
    if (this.printProblem() || this.ebookProblem()) {
      return;
    }
    void this.save(
      { ...this.publishing(), isbnPrint: this.isbnPrint().trim() || null, isbnEbook: this.isbnEbook().trim() || null },
      'ISBN salvo: sai nos créditos do livro.',
    );
  }

  /** Mostra na hora; se o servidor recusar, volta ao que estava. */
  private async save(next: Publishing, done?: string): Promise<void> {
    const before = this.publishing();
    this.publishing.set(next);
    this.saving.set(true);
    try {
      const saved = normalizePublishing(await firstValueFrom(this.api.updatePublishing(this.bookId(), next)));
      this.publishing.set(saved);
      this.isbnPrint.set(saved.isbnPrint ?? '');
      this.isbnEbook.set(saved.isbnEbook ?? '');
      if (done) {
        this.toast.add({ severity: 'success', summary: done });
      }
    } catch (error) {
      this.publishing.set(before);
      this.toast.add({ severity: 'error', summary: problemMessage(error, 'Não foi possível salvar.') });
    } finally {
      this.saving.set(false);
    }
  }
}
