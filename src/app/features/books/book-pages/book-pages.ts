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
import { BookDetail, BookPages, UniverseImage } from '../../../core/models/api.models';
import { UniverseApi } from '../../../core/api/universe.api';
import { IllustrationPickerComponent } from '../../editor/illustration/illustration-picker';
import { HasUnsavedChanges } from '../../../core/util/unsaved-changes.guard';

export const EMPTY_PAGES: BookPages = {
  credits: null,
  dedication: null,
  epigraph: null,
  epigraphSource: null,
  acknowledgments: null,
  aboutAuthor: null,
  aboutAuthorTitle: null,
  halfTitle: false,
  catalogCard: null,
  colophon: null,
  authorPhotoId: null,
};

/** As páginas que são texto (a falsa folha de rosto é uma escolha; a foto, uma imagem). */
type TextKey = Exclude<keyof BookPages, 'halfTitle'>;

/** Rascunho da tela: texto (vazio em vez de null) e a falsa folha de rosto, para comparar e editar sem cuidado. */
export type PagesDraft = Record<TextKey, string> & { halfTitle: boolean };

export function toDraft(pages: BookPages | null | undefined): PagesDraft {
  // Só as chaves conhecidas: o que mais vier da API não entra no rascunho
  const text = Object.fromEntries(
    Object.keys(EMPTY_PAGES)
      .filter((key) => key !== 'halfTitle')
      .map((key) => {
        const value = pages?.[key as TextKey];
        return [key, typeof value === 'string' ? value : ''];
      }),
  ) as Record<TextKey, string>;
  return { ...text, halfTitle: !!pages?.halfTitle };
}

/** O que vai para a API: texto limpo nas pontas, vazio vira null (a página sai do livro). */
export function toPages(draft: PagesDraft): BookPages {
  const pages = Object.fromEntries(
    Object.entries(draft)
      .filter(([key]) => key !== 'halfTitle')
      .map(([key, value]) => [key, (value as string).trim() === '' ? null : (value as string).trim()]),
  ) as unknown as BookPages;
  return { ...pages, halfTitle: draft.halfTitle };
}

/** Quantas páginas extras o livro vai ter (a epígrafe sem texto não conta). */
export function pageCount(pages: BookPages): number {
  const text = [pages.credits ?? pages.catalogCard, pages.dedication, pages.epigraph, pages.acknowledgments,
    pages.aboutAuthor, pages.colophon].filter((value) => !!value?.trim()).length;
  return text + (pages.halfTitle ? 1 : 0);
}

/** Um modelo de ficha catalográfica, para a bibliotecária (ou o bibliotecário) completar. */
export function catalogCardTemplate(title: string, author: string, year: number): string {
  return [
    'Dados Internacionais de Catalogação na Publicação (CIP)',
    '',
    `${author}`,
    `${title} / ${author}. – 1. ed. – [Cidade]: [Editora], ${year}.`,
    '[número] p. : il. ; [largura] x [altura] cm',
    '',
    'ISBN [número]',
    '',
    '1. [Assunto]. I. Título.',
    '',
    'CDD [número]',
    'Ficha elaborada por [nome] – CRB-[região]/[número]',
  ].join('\n');
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
    IllustrationPickerComponent,
  ],
  templateUrl: './book-pages.html',
  styleUrl: './book-pages.scss',
})
export class BookPagesComponent implements HasUnsavedChanges {
  private readonly api = inject(ManuscriptApi);
  private readonly toast = inject(MessageService);
  private readonly auth = inject(AuthService);
  private readonly universes = inject(UniverseApi);

  readonly bookId = input.required<string>();

  readonly book = signal<BookDetail | null>(null);
  readonly loadError = signal<string | null>(null);
  readonly draft = signal<PagesDraft>(toDraft(null));
  private readonly saved = signal(JSON.stringify(toDraft(null)));
  readonly saving = signal(false);

  readonly dirty = computed(() => JSON.stringify(this.draft()) !== this.saved());
  /** O seletor da biblioteca, para a foto de quem escreveu. */
  readonly pickerOpen = signal(false);
  readonly photoUrl = signal<string | null>(null);
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
      void this.loadPhoto(book);
    } catch (error) {
      this.loadError.set(problemMessage(error, 'Não foi possível abrir o livro.'));
    }
  }

  /** O endereço da foto guardada (está na biblioteca do universo do livro). */
  private async loadPhoto(book: BookDetail): Promise<void> {
    const id = book.pages?.authorPhotoId;
    if (!id) {
      this.photoUrl.set(null);
      return;
    }
    try {
      const images = await firstValueFrom(this.universes.listImages(book.universeId));
      this.photoUrl.set(images.find((i) => i.id === id)?.url ?? null);
    } catch {
      // sem a lista, a foto fica sem prévia (o id continua salvo)
    }
  }

  pickPhoto(image: UniverseImage): void {
    this.set('authorPhotoId', image.id);
    this.photoUrl.set(image.url);
  }

  removePhoto(): void {
    this.set('authorPhotoId', '');
    this.photoUrl.set(null);
  }

  setHalfTitle(on: boolean): void {
    this.draft.update((draft) => ({ ...draft, halfTitle: on }));
  }

  /** Preenche a ficha com o modelo (só se estiver vazia). */
  useCatalogTemplate(): void {
    const book = this.book();
    if (!book || this.draft().catalogCard.trim()) {
      return;
    }
    this.set('catalogCard', catalogCardTemplate(book.title, this.authorName(), new Date().getFullYear()));
  }

  private reset(pages: BookPages | null | undefined): void {
    const draft = toDraft(pages);
    this.draft.set(draft);
    this.saved.set(JSON.stringify(draft));
  }

  set(key: TextKey, value: string): void {
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
