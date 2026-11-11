import { Component, HostListener, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { firstValueFrom } from 'rxjs';
import { ImageGalleryComponent } from '../../../shared/gallery/image-gallery';

import { problemMessage, problemOf } from '../../../core/api/problem';
import { UniverseApi } from '../../../core/api/universe.api';
import {
  AppearanceValues,
  CustomFieldDefinition,
  LoreDefinition,
  LoreSummary,
  Place,
  PlaceSheet,
  PlaceSummary,
  PlaceType,
  Portrait,
} from '../../../core/models/api.models';
import { HasUnsavedChanges } from '../../../core/util/unsaved-changes.guard';
import { stableJson, withValue } from '../../characters/appearance-values';
import { PLACE_FIELDS, PLACE_TYPE_OPTIONS, placeTree, selfAndDescendants } from '../place-labels';
import { MentionedInComponent } from '../../../shared/mentions/mentioned-in';
import { CustomFieldsComponent, CustomValueChange } from '../../../shared/custom-fields/custom-fields';

interface Draft {
  name: string;
  aliases: string[];
  sheet: PlaceSheet;
  custom: AppearanceValues;
}

/** Ficha do lugar: tipo, "dentro de", onde fica, descrição, clima, regras e história. */
@Component({
  selector: 'app-place-editor',
  imports: [
    RouterLink,
    FormsModule,
    AutoCompleteModule,
    ButtonModule,
    ConfirmDialogModule,
    InputTextModule,
    MessageModule,
    ProgressSpinnerModule,
    SelectModule,
    TextareaModule,
    ImageGalleryComponent,
    MentionedInComponent,
    CustomFieldsComponent,
  ],
  providers: [ConfirmationService],
  templateUrl: './place-editor.html',
  styleUrl: './place-editor.scss',
})
export class PlaceEditorComponent implements HasUnsavedChanges {
  private readonly api = inject(UniverseApi);
  private readonly router = inject(Router);
  private readonly toast = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);

  /** Aberto pelo livro (`/books/:bookId/places/:id`) ou pelo universo (`/universes/:universeId/places/:id`). */
  readonly bookId = input<string>();
  readonly universeId = input<string>();
  readonly placeId = input.required<string>();
  readonly listRoute = computed(() =>
    this.bookId() ? ['/books', this.bookId() as string, 'places'] : ['/universes', this.universeId() as string, 'places'],
  );

  readonly place = signal<Place | null>(null);
  /** Os outros lugares do universo, para o "dentro de". */
  readonly places = signal<PlaceSummary[]>([]);
  /** Religiões, governo, idiomas e organizações presentes neste lugar. */
  readonly lore = signal<LoreSummary[]>([]);
  readonly loreDefinition = signal<LoreDefinition | null>(null);
  readonly draft = signal<Draft>({ name: '', aliases: [], sheet: {}, custom: {} });
  /** Campos próprios do autor para lugares, neste universo. */
  readonly customDefinition = signal<CustomFieldDefinition>({});
  private readonly saved = signal('');

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly conflict = signal(false);

  readonly dirty = computed(() => this.place() !== null && stableJson(this.draft()) !== this.saved());
  /** Opções do "dentro de": em árvore, sem o próprio lugar e sem o que está dentro dele (evita ciclo). */
  readonly parentOptions = computed(() => {
    const blocked = selfAndDescendants(this.places(), this.placeId());
    return placeTree(this.places())
      .filter((node) => !blocked.has(node.place.id))
      .map((node) => ({ value: node.place.id, label: node.place.name, depth: node.depth }));
  });

  readonly typeOptions = PLACE_TYPE_OPTIONS;
  readonly fields = PLACE_FIELDS;

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

  onPortrait(portrait: Portrait): void {
    this.place.update((p) => (p ? { ...p, portraitId: portrait.imageId, portraitUrl: portrait.url } : p));
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    this.conflict.set(false);
    try {
      const place = await firstValueFrom(this.api.getPlace(this.placeId()));
      const [places, custom] = await Promise.all([
        firstValueFrom(this.api.listPlaces(place.universeId)),
        firstValueFrom(this.api.customFields(place.universeId)).catch(() => ({}) as CustomFieldDefinition),
      ]);
      this.places.set(places);
      this.customDefinition.set(custom);
      this.reset(place);
      // O contexto do mundo é um extra: se falhar, a ficha do lugar abre do mesmo jeito
      Promise.all([firstValueFrom(this.api.loreAtPlace(place.id)), firstValueFrom(this.api.loreForm())]).then(
        ([lore, definition]) => {
          this.lore.set(lore);
          this.loreDefinition.set(definition);
        },
        () => this.lore.set([]),
      );
    } catch (error) {
      this.error.set(problemMessage(error, 'Não foi possível abrir o lugar.'));
    } finally {
      this.loading.set(false);
    }
  }

  private reset(place: Place): void {
    this.place.set(place);
    const draft: Draft = {
      name: place.name,
      aliases: [...place.aliases],
      sheet: { ...place.sheet },
      custom: { ...place.custom },
    };
    this.draft.set(draft);
    this.saved.set(stableJson(draft));
  }

  setName(name: string): void {
    this.draft.update((d) => ({ ...d, name }));
  }

  setAliases(aliases: string[] | null): void {
    this.draft.update((d) => ({ ...d, aliases: aliases ?? [] }));
  }

  setType(type: PlaceType): void {
    this.setSheet('type', this.draft().sheet.type === type ? '' : type);
  }

  setSheet(key: keyof PlaceSheet, value: string | null): void {
    this.draft.update((d) => {
      const sheet = { ...d.sheet } as Record<string, string>;
      if (!value || value.trim() === '') {
        delete sheet[key];
      } else {
        sheet[key] = value;
      }
      return { ...d, sheet: sheet as PlaceSheet };
    });
  }

  setCustom(change: CustomValueChange): void {
    this.draft.update((d) => ({ ...d, custom: withValue(d.custom, change.key, change.value) }));
  }

  async save(): Promise<void> {
    const place = this.place();
    const draft = this.draft();
    if (!place || !draft.name.trim()) {
      return;
    }
    this.saving.set(true);
    try {
      const saved = await firstValueFrom(this.api.updatePlace(place.id, { version: place.version, ...draft }));
      this.reset(saved);
      this.toast.add({ severity: 'success', summary: 'Lugar salvo', life: 2500 });
    } catch (error) {
      if (problemOf(error)?.code === 'place_version_conflict') {
        this.conflict.set(true);
      } else {
        this.toast.add({ severity: 'error', summary: problemMessage(error), life: 6000 });
      }
    } finally {
      this.saving.set(false);
    }
  }

  discard(): void {
    const place = this.place();
    if (place) {
      this.reset(place);
    }
  }

  confirmDelete(): void {
    const place = this.place();
    if (!place) {
      return;
    }
    this.confirm.confirm({
      header: 'Excluir lugar?',
      message: `"${place.name}" vai para a lixeira por 30 dias. O que estiver dentro dele passa para o lugar de cima.`,
      acceptLabel: 'Excluir',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text p-button-secondary',
      accept: () => void this.delete(place),
    });
  }

  private async delete(place: Place): Promise<void> {
    try {
      await firstValueFrom(this.api.deletePlace(place.id));
      this.saved.set(stableJson(this.draft()));
      this.toast.add({ severity: 'success', summary: `"${place.name}" foi excluído`, life: 3000 });
      await this.router.navigate(this.listRoute());
    } catch (error) {
      this.toast.add({ severity: 'error', summary: problemMessage(error) });
    }
  }
}
