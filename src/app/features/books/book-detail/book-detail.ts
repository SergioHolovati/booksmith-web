import { Component, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { firstValueFrom } from 'rxjs';

import { ContinuityApi } from '../../../core/api/continuity.api';
import { ManuscriptApi } from '../../../core/api/manuscript.api';
import { UniverseApi } from '../../../core/api/universe.api';
import { problemMessage } from '../../../core/api/problem';
import {
  BookDetail,
  ChapterSummary,
  CharacterSummary,
  ContinuityOverview,
  PlaceSummary,
  TimelineEvent,
} from '../../../core/models/api.models';
import { formatCount } from '../../../core/util/word-count';
import { BookCoverComponent } from '../book-cover';
import { KIND_LABEL, LANGUAGE_LABEL, STATUS_LABEL } from '../book-labels';
import { AskBookComponent } from '../ask-book/ask-book';
import { BookTextsComponent } from '../book-texts/book-texts';
import { PlotIdeasComponent } from '../plot-ideas/plot-ideas';

@Component({
  selector: 'app-book-detail',
  imports: [RouterLink, ButtonModule, ConfirmDialogModule, DialogModule, ProgressSpinnerModule, BookCoverComponent, AskBookComponent, BookTextsComponent,
    PlotIdeasComponent],
  providers: [ConfirmationService],
  templateUrl: './book-detail.html',
  styleUrl: './book-detail.scss',
})
export class BookDetailComponent {
  private readonly api = inject(ManuscriptApi);
  private readonly router = inject(Router);
  private readonly toast = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);
  private readonly universe = inject(UniverseApi);
  private readonly continuity = inject(ContinuityApi);

  readonly bookId = input.required<string>();

  readonly book = signal<BookDetail | null>(null);
  readonly error = signal<string | null>(null);
  readonly creatingChapter = signal(false);
  readonly reordering = signal(false);
  /** Parte: o capítulo que a abre (diálogo aberto) e o nome em edição. */
  readonly partChapter = signal<ChapterSummary | null>(null);
  readonly partDraft = signal('');
  readonly savingPart = signal(false);
  /** Personagens do universo do livro; null enquanto carrega (ou se falhar: o livro abre do mesmo jeito). */
  readonly characters = signal<CharacterSummary[] | null>(null);
  readonly places = signal<PlaceSummary[] | null>(null);
  readonly timeline = signal<TimelineEvent[] | null>(null);
  readonly continuityOverview = signal<ContinuityOverview | null>(null);
  /** Nome do universo do livro (uma série pode compartilhar um); null enquanto carrega. */
  readonly universeName = signal<string | null>(null);
  readonly placePreview = computed(() =>
    (this.places() ?? [])
      .slice(0, 3)
      .map((p) => p.name)
      .join(', '),
  );
  readonly characterPreview = computed(() =>
    (this.characters() ?? [])
      .slice(0, 3)
      .map((c) => c.name)
      .join(', '),
  );

  readonly totalWords = computed(() => this.book()?.chapters.reduce((sum, c) => sum + c.wordCount, 0) ?? 0);
  /** "Continuar escrevendo" abre o capítulo editado por último. */
  readonly lastChapter = computed(() =>
    [...(this.book()?.chapters ?? [])].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ?? null,
  );

  readonly statusLabel = STATUS_LABEL;
  readonly kindLabel = KIND_LABEL;
  readonly languageLabel = LANGUAGE_LABEL;
  readonly formatCount = formatCount;

  constructor() {
    queueMicrotask(() => void this.load());
  }

  async load(): Promise<void> {
    this.error.set(null);
    try {
      const book = await firstValueFrom(this.api.getBook(this.bookId()));
      this.book.set(book);
      void this.loadCharacters(book.universeId);
      firstValueFrom(this.continuity.overview(book.id)).then(
        (overview) => this.continuityOverview.set(overview),
        () => this.continuityOverview.set(null),
      );
    } catch (error) {
      this.error.set(problemMessage(error, 'Não foi possível abrir o livro.'));
    }
  }

  private async loadCharacters(universeId: string): Promise<void> {
    const [characters, places, timeline] = await Promise.allSettled([
      firstValueFrom(this.universe.listCharacters(universeId)),
      firstValueFrom(this.universe.listPlaces(universeId)),
      firstValueFrom(this.universe.timeline(universeId)),
    ]);
    this.characters.set(characters.status === 'fulfilled' ? characters.value : null);
    this.places.set(places.status === 'fulfilled' ? places.value : null);
    this.timeline.set(timeline.status === 'fulfilled' ? timeline.value : null);
    firstValueFrom(this.universe.listUniverses()).then(
      (universes) => this.universeName.set(universes.find((u) => u.id === universeId)?.name ?? null),
      () => this.universeName.set(null),
    );
  }

  async newChapter(): Promise<void> {
    this.creatingChapter.set(true);
    try {
      const chapter = await firstValueFrom(this.api.createChapter(this.bookId()));
      await this.router.navigate(['/write', chapter.id]);
    } catch (error) {
      this.toast.add({ severity: 'error', summary: problemMessage(error, 'Não foi possível criar o capítulo.') });
    } finally {
      this.creatingChapter.set(false);
    }
  }

  async move(index: number, direction: -1 | 1): Promise<void> {
    const book = this.book();
    const target = index + direction;
    if (!book || target < 0 || target >= book.chapters.length) {
      return;
    }

    const reordered = [...book.chapters];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    // Otimista: a lista muda na hora e volta se a API recusar
    this.book.set({ ...book, chapters: reordered });
    this.reordering.set(true);
    try {
      const saved = await firstValueFrom(this.api.reorderChapters(book.id, reordered.map((c) => c.id)));
      this.book.update((current) => (current ? { ...current, chapters: saved } : current));
    } catch (error) {
      this.book.set(book);
      this.toast.add({ severity: 'error', summary: problemMessage(error, 'Não foi possível reordenar.') });
    } finally {
      this.reordering.set(false);
    }
  }

  confirmDeleteChapter(chapter: ChapterSummary): void {
    this.confirm.confirm({
      header: 'Excluir capítulo?',
      message: `"${chapter.title}" vai para a lixeira, onde fica 30 dias e pode ser restaurado.`,
      acceptLabel: 'Excluir',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text',
      accept: async () => {
        try {
          await firstValueFrom(this.api.deleteChapter(chapter.id));
          this.book.update((b) => (b ? { ...b, chapters: b.chapters.filter((c) => c.id !== chapter.id) } : b));
        } catch (error) {
          this.toast.add({ severity: 'error', summary: problemMessage(error) });
        }
      },
    });
  }

  confirmDeleteBook(): void {
    const book = this.book();
    if (!book) {
      return;
    }
    this.confirm.confirm({
      header: 'Excluir livro?',
      message: `"${book.title}" e seus capítulos vão para a lixeira, onde ficam 30 dias e podem ser restaurados.`,
      acceptLabel: 'Excluir',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text',
      accept: async () => {
        try {
          await firstValueFrom(this.api.deleteBook(book.id));
          this.toast.add({ severity: 'success', summary: 'Livro movido para a lixeira', detail: 'Pode ser restaurado por 30 dias.' });
          await this.router.navigate(['/books']);
        } catch (error) {
          this.toast.add({ severity: 'error', summary: problemMessage(error) });
        }
      },
    });
  }

  editPart(chapter: ChapterSummary): void {
    this.partDraft.set(chapter.partTitle ?? '');
    this.partChapter.set(chapter);
  }

  async savePart(): Promise<void> {
    const title = this.partDraft().trim();
    if (title) {
      await this.applyPart(title);
    }
  }

  async removePart(): Promise<void> {
    await this.applyPart(null);
  }

  private async applyPart(title: string | null): Promise<void> {
    const chapter = this.partChapter();
    const book = this.book();
    if (!chapter || !book) {
      return;
    }
    this.savingPart.set(true);
    try {
      const saved = await firstValueFrom(this.api.setChapterPart(chapter.id, title));
      this.book.set({ ...book, chapters: book.chapters.map((c) => (c.id === saved.id ? { ...c, partTitle: saved.partTitle } : c)) });
      this.partChapter.set(null);
    } catch (error) {
      this.toast.add({ severity: 'error', summary: problemMessage(error), life: 5000 });
    } finally {
      this.savingPart.set(false);
    }
  }
}

