import { Component, HostListener, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TextareaModule } from 'primeng/textarea';
import { firstValueFrom } from 'rxjs';

import { ManuscriptApi } from '../../../core/api/manuscript.api';
import { problemMessage } from '../../../core/api/problem';
import { AuthService } from '../../../core/auth/auth.service';
import { BookDetail, BookPages } from '../../../core/models/api.models';
import { HasUnsavedChanges } from '../../../core/util/unsaved-changes.guard';

export const EMPTY_PAGES: BookPages = {
  credits: null,
  dedication: null,
  epigraph: null,
  epigraphSource: null,
  acknowledgments: null,
  aboutAuthor: null,
  aboutAuthorTitle: null,
};

/** Rascunho da tela: tudo texto (vazio em vez de null), para comparar e editar sem cuidado extra. */
export type PagesDraft = Record<keyof BookPages, string>;

export function toDraft(pages: BookPages | null | undefined): PagesDraft {
  // Só as chaves conhecidas: o que mais vier da API não entra no rascunho
  return Object.fromEntries(
    Object.keys(EMPTY_PAGES).map((key) => {
      const value = pages?.[key as keyof BookPages];
      return [key, typeof value === 'string' ? value : ''];
    }),
  ) as PagesDraft;
}

/** O que vai para a API: texto limpo nas pontas, vazio vira null (a página sai do livro). */
export function toPages(draft: PagesDraft): BookPages {
  return Object.fromEntries(
    Object.entries(draft).map(([key, value]) => [key, value.trim() === '' ? null : value.trim()]),
  ) as unknown as BookPages;
}

/** Quantas páginas extras o livro vai ter (a epígrafe sem texto não conta). */
export function pageCount(pages: BookPages): number {
  return [pages.credits, pages.dedication, pages.epigraph, pages.acknowledgments, pages.aboutAuthor].filter(
    (text) => !!text?.trim(),
  ).length;
}

/**
 * Páginas do livro (`/books/:id/paginas`): créditos, dedicatória e epígrafe antes da história; agradecimentos e
 * a página sobre quem escreveu depois. Saem no ePub, no PDF e no Word, na ordem de um livro impresso.
 */
@Component({
  selector: 'app-book-pages',
  imports: [
    RouterLink,
    FormsModule,
    ButtonModule,
    InputTextModule,
    MessageModule,
    ProgressSpinnerModule,
    TextareaModule,
  ],
  templateUrl: './book-pages.html',
  styleUrl: './book-pages.scss',
})
export class BookPagesComponent implements HasUnsavedChanges {
  private readonly api = inject(ManuscriptApi);
  private readonly toast = inject(MessageService);
  private readonly auth = inject(AuthService);

  readonly bookId = input.required<string>();

  readonly book = signal<BookDetail | null>(null);
  readonly loadError = signal<string | null>(null);
  readonly draft = signal<PagesDraft>(toDraft(null));
  private readonly saved = signal(JSON.stringify(toDraft(null)));
  readonly saving = signal(false);

  readonly dirty = computed(() => JSON.stringify(this.draft()) !== this.saved());
  readonly authorName = computed(() => this.auth.user()?.displayName ?? 'Seu nome');
  readonly creditsHint = computed(
    () => `© ${new Date().getFullYear()} ${this.authorName()}. Todos os direitos reservados.\nCapa: …\nRevisão: …`,
  );

  constructor() {
    queueMicrotask(() => void this.load());
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.dirty()) {
      event.preventDefault();
    }
  }

  hasUnsavedChanges(): boolean {
    return this.dirty();
  }

  async load(): Promise<void> {
    this.loadError.set(null);
    try {
      const book = await firstValueFrom(this.api.getBook(this.bookId()));
      this.book.set(book);
      this.reset(book.pages);
    } catch (error) {
      this.loadError.set(problemMessage(error, 'Não foi possível abrir o livro.'));
    }
  }

  private reset(pages: BookPages | null | undefined): void {
    const draft = toDraft(pages);
    this.draft.set(draft);
    this.saved.set(JSON.stringify(draft));
  }

  set(key: keyof BookPages, value: string): void {
    this.draft.update((draft) => ({ ...draft, [key]: value }));
  }

  async save(): Promise<void> {
    this.saving.set(true);
    try {
      const pages = await firstValueFrom(this.api.updatePages(this.bookId(), toPages(this.draft())));
      this.book.update((book) => (book ? { ...book, pages } : book));
      this.reset(pages);
      this.toast.add({ severity: 'success', summary: 'Páginas salvas', life: 2500 });
    } catch (error) {
      this.toast.add({ severity: 'error', summary: problemMessage(error), life: 6000 });
    } finally {
      this.saving.set(false);
    }
  }

  discard(): void {
    this.reset(this.book()?.pages);
  }
}
