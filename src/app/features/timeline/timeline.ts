import { Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DrawerModule } from 'primeng/drawer';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { firstValueFrom } from 'rxjs';

import { ManuscriptApi } from '../../core/api/manuscript.api';
import { problemMessage, problemOf } from '../../core/api/problem';
import { UniverseApi } from '../../core/api/universe.api';
import {
  BookDetail,
  CharacterSummary,
  PlaceSummary,
  TimelineEvent,
  TimelineEventUpdate,
} from '../../core/models/api.models';

type Draft = Omit<TimelineEventUpdate, 'version'>;

/**
 * Linha do tempo do livro: eventos na ordem que o autor escolhe (sobe e desce), cada um com "quando",
 * capítulo, lugar e personagens. Tocar no evento abre a edição numa gaveta.
 */
@Component({
  selector: 'app-timeline',
  imports: [
    RouterLink,
    FormsModule,
    ButtonModule,
    ConfirmDialogModule,
    DrawerModule,
    InputTextModule,
    MultiSelectModule,
    ProgressSpinnerModule,
    SelectModule,
    TextareaModule,
  ],
  providers: [ConfirmationService],
  templateUrl: './timeline.html',
  styleUrl: './timeline.scss',
})
export class TimelineComponent {
  private readonly manuscript = inject(ManuscriptApi);
  private readonly universe = inject(UniverseApi);
  private readonly toast = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);

  readonly bookId = input.required<string>();

  readonly book = signal<BookDetail | null>(null);
  readonly events = signal<TimelineEvent[]>([]);
  readonly characters = signal<CharacterSummary[]>([]);
  readonly places = signal<PlaceSummary[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly busy = signal(false);
  newTitle = '';

  /** Evento aberto na gaveta de edição e o rascunho dele. */
  readonly editing = signal<TimelineEvent | null>(null);
  readonly draft = signal<Draft | null>(null);
  readonly saving = signal(false);
  readonly conflict = signal(false);
  drawerOpen = false;

  readonly chapterTitles = computed(
    () => new Map((this.book()?.chapters ?? []).map((c, i) => [c.id, `${i + 1}. ${c.title}`])),
  );
  readonly chapterOptions = computed(() =>
    (this.book()?.chapters ?? []).map((c, i) => ({ value: c.id, label: `${i + 1}. ${c.title}` })),
  );
  readonly placeOptions = computed(() => this.places().map((p) => ({ value: p.id, label: p.name })));
  readonly characterOptions = computed(() => this.characters().map((c) => ({ value: c.id, label: c.name })));

  constructor() {
    queueMicrotask(() => void this.load());
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const book = await firstValueFrom(this.manuscript.getBook(this.bookId()));
      this.book.set(book);
      const [events, characters, places] = await Promise.all([
        firstValueFrom(this.universe.timeline(book.universeId)),
        firstValueFrom(this.universe.listCharacters(book.universeId)),
        firstValueFrom(this.universe.listPlaces(book.universeId)),
      ]);
      this.events.set(events);
      this.characters.set(characters);
      this.places.set(places);
    } catch (error) {
      this.error.set(problemMessage(error, 'Não foi possível abrir a linha do tempo.'));
    } finally {
      this.loading.set(false);
    }
  }

  private async reloadEvents(): Promise<void> {
    const book = this.book();
    if (book) {
      this.events.set(await firstValueFrom(this.universe.timeline(book.universeId)));
    }
  }

  async create(): Promise<void> {
    const book = this.book();
    const title = this.newTitle.trim();
    if (!book || !title) {
      return;
    }
    this.busy.set(true);
    try {
      const event = await firstValueFrom(this.universe.createEvent(book.universeId, title));
      this.newTitle = '';
      await this.reloadEvents();
      this.open(this.events().find((e) => e.id === event.id) ?? event);
    } catch (error) {
      this.toast.add({ severity: 'error', summary: problemMessage(error) });
    } finally {
      this.busy.set(false);
    }
  }

  /** Sobe ou desce uma posição. */
  async move(index: number, direction: -1 | 1): Promise<void> {
    const events = this.events();
    const event = events[index];
    const target = index + direction;
    if (!event || target < 0 || target >= events.length) {
      return;
    }
    // Depois de quem o evento vai ficar: subir = depois do que está duas posições acima (ou no começo)
    const afterId = direction === -1 ? (events[index - 2]?.id ?? null) : events[index + 1].id;
    this.busy.set(true);
    try {
      await firstValueFrom(this.universe.moveEvent(event.id, afterId));
      await this.reloadEvents();
    } catch (error) {
      this.toast.add({ severity: 'error', summary: problemMessage(error) });
    } finally {
      this.busy.set(false);
    }
  }

  // ===== Edição =====

  open(event: TimelineEvent): void {
    this.editing.set(event);
    this.conflict.set(false);
    this.draft.set({
      title: event.title,
      whenLabel: event.whenLabel,
      description: event.description,
      chapterId: event.chapterId,
      placeId: event.place?.id ?? null,
      characterIds: event.characters.map((c) => c.id),
    });
    this.drawerOpen = true;
  }

  patch(change: Partial<Draft>): void {
    this.draft.update((d) => (d ? { ...d, ...change } : d));
  }

  async save(): Promise<void> {
    const event = this.editing();
    const draft = this.draft();
    if (!event || !draft || !draft.title.trim()) {
      return;
    }
    this.saving.set(true);
    try {
      await firstValueFrom(this.universe.updateEvent(event.id, { version: event.version, ...draft }));
      await this.reloadEvents();
      this.drawerOpen = false;
      this.toast.add({ severity: 'success', summary: 'Evento salvo', life: 2500 });
    } catch (error) {
      if (problemOf(error)?.code === 'event_version_conflict') {
        this.conflict.set(true);
      } else {
        this.toast.add({ severity: 'error', summary: problemMessage(error), life: 6000 });
      }
    } finally {
      this.saving.set(false);
    }
  }

  async reloadEditing(): Promise<void> {
    const id = this.editing()?.id;
    await this.reloadEvents();
    const fresh = this.events().find((e) => e.id === id);
    if (fresh) {
      this.open(fresh);
    } else {
      this.drawerOpen = false;
    }
  }

  confirmDelete(): void {
    const event = this.editing();
    if (!event) {
      return;
    }
    this.confirm.confirm({
      header: 'Excluir evento?',
      message: `"${event.title}" sai da linha do tempo. O texto do livro não muda.`,
      acceptLabel: 'Excluir',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text p-button-secondary',
      accept: () => void this.delete(event),
    });
  }

  private async delete(event: TimelineEvent): Promise<void> {
    try {
      await firstValueFrom(this.universe.deleteEvent(event.id));
      this.drawerOpen = false;
      await this.reloadEvents();
      this.toast.add({ severity: 'success', summary: 'Evento excluído', life: 2500 });
    } catch (error) {
      this.toast.add({ severity: 'error', summary: problemMessage(error) });
    }
  }
}
