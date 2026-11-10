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
  LoreSummary,
  PlaceSummary,
  TimelineEvent,
  TimelineEventUpdate,
  UniverseDetail,
  WorldCalendar,
} from '../../core/models/api.models';
import { DateDraft, EVENT_KINDS, daysIn, fromDraft, kindOf, toDraft } from './event-kinds';

type Draft = Omit<TimelineEventUpdate, 'version' | 'date'> & { date: DateDraft };

/**
 * Linha do tempo do universo: eventos na ordem que o autor escolhe (sobe e desce), cada um com tipo, data no
 * calendário do mundo (ou "quando" em texto), capítulo, lugar, personagens e o que do mundo está envolvido
 * (religiões, governos, organizações). Com o nascimento de um personagem, cada evento datado mostra a idade
 * dele. Abre pelo livro (`/books/:bookId/timeline`) ou pelo universo (`/universes/:universeId/timeline`).
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

  readonly bookId = input<string>();
  readonly universeId = input<string>();

  readonly book = signal<BookDetail | null>(null);
  readonly universeDetail = signal<UniverseDetail | null>(null);
  readonly calendar = signal<WorldCalendar | null>(null);
  readonly lore = signal<LoreSummary[]>([]);
  readonly currentUniverseId = computed(() => this.universeId() ?? this.book()?.universeId ?? null);
  readonly backRoute = computed(() =>
    this.bookId() ? ['/books', this.bookId() as string] : ['/universes', this.universeId() as string],
  );
  readonly backLabel = computed(() => this.book()?.title ?? this.universeDetail()?.name ?? 'Voltar');
  readonly datedCount = computed(() => this.events().filter((e) => e.date).length);
  readonly kindOf = kindOf;
  readonly kindOptions = EVENT_KINDS;
  readonly eraOptions = computed(() =>
    (this.calendar()?.eras ?? []).map((e) => ({ value: e.key, label: e.name || e.abbreviation || 'Era' })),
  );
  readonly monthOptions = computed(() =>
    (this.calendar()?.months ?? []).map((m, i) => ({ value: i + 1, label: m.name })),
  );
  readonly loreOptions = computed(() => this.lore().map((l) => ({ value: l.id, label: l.name })));
  readonly maxDay = computed(() => {
    const calendar = this.calendar();
    const month = this.draft()?.date.month ?? null;
    return calendar ? daysIn(calendar, month) : 31;
  });
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
      const bookId = this.bookId();
      if (bookId) {
        this.book.set(await firstValueFrom(this.manuscript.getBook(bookId)));
      } else {
        this.universeDetail.set(await firstValueFrom(this.universe.getUniverse(this.universeId() as string)));
      }
      const universeId = this.currentUniverseId() as string;
      const [events, characters, places, calendar, lore] = await Promise.all([
        firstValueFrom(this.universe.timeline(universeId)),
        firstValueFrom(this.universe.listCharacters(universeId)),
        firstValueFrom(this.universe.listPlaces(universeId)),
        firstValueFrom(this.universe.calendar(universeId)),
        firstValueFrom(this.universe.listLore(universeId)),
      ]);
      this.events.set(events);
      this.characters.set(characters);
      this.places.set(places);
      this.calendar.set(calendar);
      this.lore.set(lore.filter((l) => l.type !== 'language'));
    } catch (error) {
      this.error.set(problemMessage(error, 'Não foi possível abrir a linha do tempo.'));
    } finally {
      this.loading.set(false);
    }
  }

  private async reloadEvents(): Promise<void> {
    const universeId = this.currentUniverseId();
    if (universeId) {
      this.events.set(await firstValueFrom(this.universe.timeline(universeId)));
    }
  }

  async create(): Promise<void> {
    const universeId = this.currentUniverseId();
    const title = this.newTitle.trim();
    if (!universeId || !title) {
      return;
    }
    this.busy.set(true);
    try {
      const event = await firstValueFrom(this.universe.createEvent(universeId, title));
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

  /** Põe os eventos datados em ordem cronológica; os sem data ficam onde estavam. */
  async sortByDate(): Promise<void> {
    const universeId = this.currentUniverseId();
    if (!universeId) {
      return;
    }
    this.busy.set(true);
    try {
      this.events.set(await firstValueFrom(this.universe.sortTimelineByDate(universeId)));
      this.toast.add({ severity: 'success', summary: 'Eventos com data em ordem cronológica', life: 2500 });
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
      kind: event.kind,
      loreIds: event.lore.map((l) => l.id),
      date: toDraft(event.date, this.calendar() ?? { eras: [], months: [], weekdays: [] }),
    });
    this.drawerOpen = true;
  }

  patch(change: Partial<Draft>): void {
    this.draft.update((d) => (d ? { ...d, ...change } : d));
  }

  patchDate(change: Partial<DateDraft>): void {
    this.draft.update((d) => (d ? { ...d, date: { ...d.date, ...change } } : d));
  }

  async save(): Promise<void> {
    const event = this.editing();
    const draft = this.draft();
    if (!event || !draft || !draft.title.trim()) {
      return;
    }
    this.saving.set(true);
    try {
      const { date, ...rest } = draft;
      await firstValueFrom(
        this.universe.updateEvent(event.id, { version: event.version, ...rest, date: fromDraft(date) }),
      );
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
      message: `"${event.title}" vai para a lixeira por 30 dias. O texto do livro não muda.`,
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
