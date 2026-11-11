import { Component, HostListener, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageModule } from 'primeng/message';
import { MultiSelectModule } from 'primeng/multiselect';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { firstValueFrom } from 'rxjs';

import { problemMessage, problemOf } from '../../../core/api/problem';
import { UniverseApi } from '../../../core/api/universe.api';
import {
  AppearanceField,
  AppearanceValue,
  AppearanceValues,
  CustomFieldDefinition,
  Lore,
  LoreDefinition,
  PlaceSummary,
} from '../../../core/models/api.models';
import { HasUnsavedChanges } from '../../../core/util/unsaved-changes.guard';
import { BuilderFieldComponent } from '../../../shared/builder/builder-field';
import { stableJson, withValue } from '../../characters/appearance-values';
import { MentionedInComponent } from '../../../shared/mentions/mentioned-in';
import { CustomFieldsComponent, CustomValueChange } from '../../../shared/custom-fields/custom-fields';

interface Draft {
  name: string;
  values: AppearanceValues;
  placeIds: string[];
  custom: AppearanceValues;
}

/**
 * Ficha de uma religião, sistema político, idioma ou organização: os campos do tipo (definidos pela API, nada
 * obrigatório) e os lugares onde está presente. Salva tudo de uma vez; sair com alterações pede confirmação.
 */
@Component({
  selector: 'app-lore-editor',
  imports: [
    RouterLink,
    FormsModule,
    ButtonModule,
    ConfirmDialogModule,
    MessageModule,
    MultiSelectModule,
    ProgressSpinnerModule,
    BuilderFieldComponent,
    MentionedInComponent,
    CustomFieldsComponent,
  ],
  providers: [ConfirmationService],
  templateUrl: './lore-editor.html',
  styleUrl: './lore-editor.scss',
})
export class LoreEditorComponent implements HasUnsavedChanges {
  private readonly api = inject(UniverseApi);
  private readonly router = inject(Router);
  private readonly toast = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);

  readonly universeId = input.required<string>();
  readonly loreId = input.required<string>();

  readonly item = signal<Lore | null>(null);
  readonly definition = signal<LoreDefinition | null>(null);
  readonly places = signal<PlaceSummary[]>([]);
  readonly draft = signal<Draft>({ name: '', values: {}, placeIds: [], custom: {} });
  readonly customDefinition = signal<CustomFieldDefinition>({});
  private readonly saved = signal('');
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly conflict = signal(false);

  readonly dirty = computed(() => this.item() !== null && stableJson(this.draft()) !== this.saved());
  readonly type = computed(() => {
    const item = this.item();
    return item ? (this.definition()?.types[item.type] ?? null) : null;
  });
  readonly customFields = computed(() => this.customDefinition()[this.item()?.type ?? ''] ?? []);
  /** Lugares para escolher, com o "dentro de" para diferenciar nomes parecidos. */
  readonly placeOptions = computed(() =>
    this.places().map((p) => ({ value: p.id, label: p.parentName ? `${p.name} (${p.parentName})` : p.name })),
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
    this.loading.set(true);
    this.error.set(null);
    this.conflict.set(false);
    try {
      const [item, definition, places, custom] = await Promise.all([
        firstValueFrom(this.api.getLore(this.loreId())),
        firstValueFrom(this.api.loreForm()),
        firstValueFrom(this.api.listPlaces(this.universeId())),
        firstValueFrom(this.api.customFields(this.universeId())),
      ]);
      this.definition.set(definition);
      this.customDefinition.set(custom);
      this.places.set(places);
      this.reset(item);
    } catch (error) {
      this.error.set(problemMessage(error, 'Não foi possível abrir a ficha.'));
    } finally {
      this.loading.set(false);
    }
  }

  private reset(item: Lore): void {
    this.item.set(item);
    const draft: Draft = {
      name: item.name,
      values: { ...item.values },
      placeIds: item.places.map((p) => p.id),
      custom: { ...item.custom },
    };
    this.draft.set(draft);
    this.saved.set(stableJson(draft));
  }

  setName(name: string): void {
    this.draft.update((d) => ({ ...d, name }));
  }

  value(field: AppearanceField): AppearanceValue | undefined {
    return this.draft().values[field.key];
  }

  setValue(field: AppearanceField, value: AppearanceValue | null): void {
    this.draft.update((d) => ({ ...d, values: withValue(d.values, field.key, value) }));
  }

  setCustom(change: CustomValueChange): void {
    this.draft.update((d) => ({ ...d, custom: withValue(d.custom, change.key, change.value) }));
  }

  setPlaces(placeIds: string[] | null): void {
    this.draft.update((d) => ({ ...d, placeIds: placeIds ?? [] }));
  }

  async save(): Promise<void> {
    const item = this.item();
    const draft = this.draft();
    if (!item || !draft.name.trim()) {
      return;
    }
    this.saving.set(true);
    try {
      const saved = await firstValueFrom(
        this.api.updateLore(item.id, {
          version: item.version,
          name: draft.name,
          aliases: item.aliases,
          values: draft.values,
          placeIds: draft.placeIds,
          custom: draft.custom,
        }),
      );
      this.reset(saved);
      this.toast.add({ severity: 'success', summary: 'Ficha salva', life: 2500 });
    } catch (error) {
      if (problemOf(error)?.code === 'lore_version_conflict') {
        this.conflict.set(true);
      } else {
        this.toast.add({ severity: 'error', summary: problemMessage(error), life: 6000 });
      }
    } finally {
      this.saving.set(false);
    }
  }

  discard(): void {
    const item = this.item();
    if (item) {
      this.reset(item);
    }
  }

  confirmDelete(): void {
    const item = this.item();
    if (!item) {
      return;
    }
    this.confirm.confirm({
      header: `Excluir "${item.name}"?`,
      message: 'A ficha vai para a lixeira, onde fica 30 dias. Os lugares e o texto do livro não mudam.',
      acceptLabel: 'Excluir',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text p-button-secondary',
      accept: () => void this.delete(item),
    });
  }

  private async delete(item: Lore): Promise<void> {
    try {
      await firstValueFrom(this.api.deleteLore(item.id));
      this.saved.set(stableJson(this.draft()));
      this.toast.add({ severity: 'success', summary: `"${item.name}" foi excluído`, life: 3000 });
      await this.router.navigate(['/universes', this.universeId(), 'mundo'], { queryParams: { tipo: item.type } });
    } catch (error) {
      this.toast.add({ severity: 'error', summary: problemMessage(error) });
    }
  }
}
