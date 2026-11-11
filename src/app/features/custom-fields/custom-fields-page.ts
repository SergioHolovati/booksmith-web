import { Component, HostListener, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { firstValueFrom } from 'rxjs';

import { problemMessage } from '../../core/api/problem';
import { UniverseApi } from '../../core/api/universe.api';
import {
  AppearanceField,
  CustomFieldDefinition,
  CustomFieldDraft,
  LoreDefinition,
  UniverseDetail,
} from '../../core/models/api.models';
import { HasUnsavedChanges } from '../../core/util/unsaved-changes.guard';
import { stableJson } from '../characters/appearance-values';
import { LORE_TYPES } from '../lore/lore-list/lore-list';

type FieldType = CustomFieldDraft['type'];

export const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: 'text', label: 'Texto curto' },
  { value: 'longtext', label: 'Texto longo' },
  { value: 'choice', label: 'Escolher uma' },
  { value: 'multi', label: 'Escolher várias' },
  { value: 'scale', label: 'Escala de 1 a 5' },
];

export const MAX_FIELDS = 30;
export const MAX_OPTIONS = 30;

/** O que vem da API vira rascunho editável (as chaves e os valores das opções vão junto, para não mudarem). */
export function toDraft(field: AppearanceField): CustomFieldDraft {
  const draft: CustomFieldDraft = { key: field.key, label: field.label, type: field.type as FieldType };
  if (field.options) {
    draft.options = field.options.map((o) => ({ value: o.value, label: o.label }));
    draft.allowCustom = field.allowCustom ?? false;
  }
  if (field.poles) {
    draft.poles = [field.poles[0], field.poles[1]];
  }
  return draft;
}

/** Ajusta o rascunho ao trocar o tipo: escolha ganha uma opção vazia, escala ganha as pontas. */
export function withType(field: CustomFieldDraft, type: FieldType): CustomFieldDraft {
  const next: CustomFieldDraft = { key: field.key, label: field.label, type };
  if (type === 'choice' || type === 'multi') {
    next.options = field.options?.length ? field.options : [{ label: '' }];
    next.allowCustom = field.allowCustom ?? false;
  }
  if (type === 'scale') {
    next.poles = field.poles ?? ['', ''];
  }
  return next;
}

/**
 * Campos próprios do autor (`/universes/:id/campos?tipo=`): para cada tipo de ficha (personagem, lugar, cada
 * tipo do mundo), os campos que ele quer a mais, com o tipo de resposta. Salva um tipo de ficha por vez.
 */
@Component({
  selector: 'app-custom-fields-page',
  imports: [RouterLink, FormsModule, ButtonModule, ConfirmDialogModule, InputTextModule, ProgressSpinnerModule],
  providers: [ConfirmationService],
  templateUrl: './custom-fields-page.html',
  styleUrl: './custom-fields-page.scss',
})
export class CustomFieldsPageComponent implements HasUnsavedChanges {
  private readonly api = inject(UniverseApi);
  private readonly toast = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);

  readonly universeId = input.required<string>();
  readonly tipo = input<string>();

  readonly universe = signal<UniverseDetail | null>(null);
  readonly loreDefinition = signal<LoreDefinition | null>(null);
  readonly definition = signal<CustomFieldDefinition>({});
  readonly scope = signal('character');
  readonly draft = signal<CustomFieldDraft[]>([]);
  private readonly saved = signal('[]');
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  readonly fieldTypes = FIELD_TYPES;
  readonly maxFields = MAX_FIELDS;
  readonly maxOptions = MAX_OPTIONS;

  readonly dirty = computed(() => stableJson(this.draft()) !== this.saved());
  readonly scopes = computed(() => {
    const lore = this.loreDefinition();
    return [
      { value: 'character', label: 'Personagens', icon: 'pi-user' },
      { value: 'place', label: 'Lugares', icon: 'pi-map-marker' },
      ...(lore ? LORE_TYPES.map((t) => ({ value: t, label: lore.types[t].plural, icon: lore.types[t].icon })) : []),
    ];
  });
  readonly scopeLabel = computed(() => this.scopes().find((s) => s.value === this.scope())?.label ?? '');
  /** Volta para onde faz sentido: a lista do tipo de ficha. */
  readonly backLink = computed(() => {
    const scope = this.scope();
    if (scope === 'character' || scope === 'place') {
      return { route: ['/universes', this.universeId()], query: { passo: 'peoples' } };
    }
    return { route: ['/universes', this.universeId(), 'mundo'], query: { tipo: scope } };
  });
  /** Campos que existiam e saíram do rascunho: o que foi preenchido neles deixa de aparecer. */
  readonly removed = computed(() => {
    const keys = new Set(this.draft().map((f) => f.key));
    return (this.definition()[this.scope()] ?? []).filter((f) => !keys.has(f.key));
  });
  readonly canSave = computed(() =>
    this.draft().every(
      (f) => f.label.trim() !== '' && (!f.options || (f.options.length > 0 && f.options.every((o) => o.label.trim() !== ''))),
    ),
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
    try {
      const [universe, lore, definition] = await Promise.all([
        firstValueFrom(this.api.getUniverse(this.universeId())),
        firstValueFrom(this.api.loreForm()),
        firstValueFrom(this.api.customFields(this.universeId())),
      ]);
      this.universe.set(universe);
      this.loreDefinition.set(lore);
      this.definition.set(definition);
      const wanted = this.tipo();
      this.open(wanted && wanted in definition ? wanted : 'character');
    } catch (error) {
      this.error.set(problemMessage(error, 'Não foi possível abrir os campos.'));
    } finally {
      this.loading.set(false);
    }
  }

  /** Troca de tipo de ficha; com alterações não salvas, pergunta antes. */
  select(scope: string): void {
    if (scope === this.scope()) {
      return;
    }
    if (!this.dirty()) {
      this.open(scope);
      return;
    }
    this.confirm.confirm({
      header: 'Descartar as alterações?',
      message: `Os campos de ${this.scopeLabel().toLowerCase()} mudaram e ainda não foram salvos.`,
      acceptLabel: 'Descartar',
      rejectLabel: 'Continuar editando',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text p-button-secondary',
      accept: () => this.open(scope),
    });
  }

  private open(scope: string): void {
    this.scope.set(scope);
    const fields = (this.definition()[scope] ?? []).map(toDraft);
    this.draft.set(fields);
    this.saved.set(stableJson(fields));
  }

  // ===== Campos =====

  add(): void {
    this.draft.update((fields) => [...fields, { label: '', type: 'text' }]);
  }

  private patch(index: number, update: (field: CustomFieldDraft) => CustomFieldDraft): void {
    this.draft.update((fields) => fields.map((f, i) => (i === index ? update(f) : f)));
  }

  setLabel(index: number, label: string): void {
    this.patch(index, (f) => ({ ...f, label }));
  }

  setType(index: number, type: FieldType): void {
    this.patch(index, (f) => withType(f, type));
  }

  setAllowCustom(index: number, allowCustom: boolean): void {
    this.patch(index, (f) => ({ ...f, allowCustom }));
  }

  setPole(index: number, pole: 0 | 1, text: string): void {
    this.patch(index, (f) => {
      const poles: [string, string] = [...(f.poles ?? ['', ''])] as [string, string];
      poles[pole] = text;
      return { ...f, poles };
    });
  }

  move(index: number, step: -1 | 1): void {
    this.draft.update((fields) => {
      const target = index + step;
      if (target < 0 || target >= fields.length) {
        return fields;
      }
      const next = [...fields];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  remove(index: number): void {
    this.draft.update((fields) => fields.filter((_, i) => i !== index));
  }

  // ===== Opções =====

  addOption(index: number): void {
    this.patch(index, (f) => ({ ...f, options: [...(f.options ?? []), { label: '' }] }));
  }

  setOption(index: number, option: number, label: string): void {
    this.patch(index, (f) => ({
      ...f,
      options: (f.options ?? []).map((o, i) => (i === option ? { ...o, label } : o)),
    }));
  }

  removeOption(index: number, option: number): void {
    this.patch(index, (f) => ({ ...f, options: (f.options ?? []).filter((_, i) => i !== option) }));
  }

  // ===== Salvar =====

  async save(): Promise<void> {
    if (!this.canSave()) {
      return;
    }
    this.saving.set(true);
    const scope = this.scope();
    try {
      const fields = this.draft().map((f) => ({
        ...f,
        label: f.label.trim(),
        options: f.options?.map((o) => ({ ...o, label: o.label.trim() })),
      }));
      const saved = await firstValueFrom(this.api.defineCustomFields(this.universeId(), scope, fields));
      this.definition.update((d) => ({ ...d, [scope]: saved }));
      this.open(scope);
      this.toast.add({ severity: 'success', summary: 'Campos salvos', life: 2500 });
    } catch (error) {
      this.toast.add({ severity: 'error', summary: problemMessage(error), life: 6000 });
    } finally {
      this.saving.set(false);
    }
  }

  discard(): void {
    this.open(this.scope());
  }
}
