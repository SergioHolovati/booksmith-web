import { Component, HostListener, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { firstValueFrom } from 'rxjs';

import { problemMessage, problemOf } from '../../../core/api/problem';
import { UniverseApi } from '../../../core/api/universe.api';
import {
  AppearanceField,
  PlaceSummary,
  AppearanceValue,
  ContextLine,
  UniverseBuilderDefinition,
  UniverseCollection,
  UniverseDetail,
  UniverseDetails,
  UniverseItem,
  UniverseStep,
} from '../../../core/models/api.models';
import { compressImage } from '../../../core/util/image';
import { HasUnsavedChanges } from '../../../core/util/unsaved-changes.guard';
import { BuilderFieldComponent } from '../../../shared/builder/builder-field';
import { rollEmpty, stableJson } from '../../characters/appearance-values';
import {
  itemTitle,
  itemsOf,
  newItemId,
  plainValues,
  universePortrait,
  universeProgress,
  withDetail,
  withItemValue,
  withItems,
} from '../universe-builder-values';
import { MapPlacesCardComponent } from '../map-places-card/map-places-card';
import { GENERATOR_VERSION } from '../map-generator/world';
import { AiSuggestComponent } from '../../../shared/assist/ai-suggest';
import { appendIdea } from '../../../shared/assist/ideas';

/** Tamanho máximo de um campo de texto longo do construtor (o mesmo da API). */
const LONG_TEXT_MAX = 2000;

interface Draft {
  name: string;
  details: UniverseDetails;
}

/**
 * Construtor de universo (§4.2 do produto), em passos como um processo criativo: Ideia, Mundo, Povos e
 * culturas, Mapa, Magia (vários sistemas), Ciência e Leis. Nada é obrigatório; o retrato mostra ao vivo o que
 * já existe. O mapa é enviado na hora; o resto é salvo de uma vez, com aviso se outro aparelho salvou antes.
 */
@Component({
  selector: 'app-universe-builder',
  imports: [
    RouterLink,
    FormsModule,
    ButtonModule,
    ConfirmDialogModule,
    MessageModule,
    ProgressSpinnerModule,
    BuilderFieldComponent,
    MapPlacesCardComponent,
    AiSuggestComponent,
  ],
  providers: [ConfirmationService],
  templateUrl: './universe-builder.html',
  styleUrl: './universe-builder.scss',
})
export class UniverseBuilderComponent implements HasUnsavedChanges {
  private readonly api = inject(UniverseApi);
  private readonly toast = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);

  readonly universeId = input.required<string>();
  /** Query param `passo`: abrir direto num passo (ex.: voltando do gerador de mapa). */
  readonly passo = input<string>();

  readonly universe = signal<UniverseDetail | null>(null);
  readonly form = signal<UniverseBuilderDefinition | null>(null);
  readonly draft = signal<Draft>({ name: '', details: {} });
  private readonly saved = signal('');

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly uploadingMap = signal(false);
  readonly error = signal<string | null>(null);
  readonly conflict = signal(false);
  readonly stepKey = signal<string | null>(null);
  /** Item da coleção aberto para editar (um por vez, para caber no celular). */
  readonly openItem = signal<string | null>(null);

  readonly dirty = computed(() => this.universe() !== null && stableJson(this.draft()) !== this.saved());
  readonly steps = computed<UniverseStep[]>(() => this.form()?.tabs ?? []);
  readonly step = computed<UniverseStep | null>(
    () => this.steps().find((s) => s.key === this.stepKey()) ?? this.steps().at(0) ?? null,
  );
  readonly nextStep = computed(() => {
    const steps = this.steps();
    const index = steps.findIndex((s) => s.key === this.step()?.key);
    return index >= 0 && index < steps.length - 1 ? steps[index + 1] : null;
  });
  readonly collection = computed<UniverseCollection | null>(() => {
    const key = this.step()?.collection;
    return key ? (this.form()?.collections[key] ?? null) : null;
  });
  readonly items = computed(() => {
    const key = this.step()?.collection;
    return key ? itemsOf(this.draft().details, key) : [];
  });
  readonly portrait = computed(() => {
    const form = this.form();
    return form ? universePortrait(form, this.draft().details, this.universe()?.mapUrl ?? null) : [];
  });
  readonly progress = computed(() => {
    const form = this.form();
    return form ? universeProgress(form, this.draft().details, this.universe()?.mapUrl ?? null) : { filled: 0, total: 0 };
  });
  /** Quanto de cada passo já foi feito (mostrado nos passos). */
  readonly filledByStep = computed(() => {
    const form = this.form();
    if (!form) {
      return {} as Record<string, number>;
    }
    const plain = plainValues(form, this.draft().details);
    return Object.fromEntries(
      form.tabs.map((s) => [
        s.key,
        s.fields.filter((f) => plain[f.key] !== undefined).length +
          (s.collection ? itemsOf(this.draft().details, s.collection).length : 0) +
          (s.map && this.universe()?.mapUrl ? 1 : 0),
      ]),
    );
  });
  /** O dado só faz sentido onde há escolhas ou escalas. */
  // ===== Lugares do mapa =====

  /** Lugares do universo; os que têm posição viram pontos tocáveis sobre o mapa gerado. */
  readonly places = signal<PlaceSummary[]>([]);
  /** O mapa atual foi gerado aqui, com esta versão do gerador: as posições dos lugares batem com a imagem. */
  readonly mapIsGenerated = computed(() => this.universe()?.mapGenerator?.version === GENERATOR_VERSION);
  readonly pins = computed(() =>
    this.mapIsGenerated() ? this.places().filter((p) => p.mapX !== null && p.mapY !== null) : [],
  );
  readonly canRoll = computed(() =>
    (this.step()?.fields ?? []).some((f) => f.type === 'choice' || f.type === 'color' || f.type === 'scale'),
  );

  readonly itemTitle = itemTitle;

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
      const [universe, form] = await Promise.all([
        firstValueFrom(this.api.getUniverse(this.universeId())),
        firstValueFrom(this.api.universeBuilderForm()),
      ]);
      this.form.set(form);
      this.reset(universe);
      void this.loadPlaces();
      const wanted = this.passo();
      if (wanted && form.tabs.some((t) => t.key === wanted)) {
        this.stepKey.set(wanted);
      }
    } catch (error) {
      this.error.set(problemMessage(error, 'Não foi possível abrir o universo.'));
    } finally {
      this.loading.set(false);
    }
  }

  private reset(universe: UniverseDetail): void {
    this.universe.set(universe);
    const draft: Draft = { name: universe.name, details: structuredClone(universe.details) };
    this.draft.set(draft);
    this.saved.set(stableJson(draft));
  }

  goTo(step: UniverseStep): void {
    this.stepKey.set(step.key);
    this.openItem.set(null);
  }

  // ===== Campos simples =====

  setName(name: string): void {
    this.draft.update((d) => ({ ...d, name }));
  }

  value(field: AppearanceField): AppearanceValue | undefined {
    const value = this.draft().details[field.key];
    return Array.isArray(value) && value.some((v) => typeof v === 'object') ? undefined : (value as AppearanceValue);
  }

  setValue(field: AppearanceField, value: AppearanceValue | null): void {
    this.draft.update((d) => ({ ...d, details: withDetail(d.details, field.key, value) }));
  }

  /** Texto atual de um campo de texto (mesmo sem salvar). */
  textOf(field: AppearanceField): string {
    const value = this.value(field);
    return typeof value === 'string' ? value : '';
  }

  /** Ideia da IA escolhida: entra no fim do campo, num parágrafo novo, para o autor reescrever. */
  appendText(field: AppearanceField, text: string): void {
    const next = appendIdea(this.textOf(field), text, LONG_TEXT_MAX);
    if (next === null) {
      this.toast.add({ severity: 'warn', summary: 'O campo ficaria longo demais. Copie a ideia e resuma.', life: 4000 });
      return;
    }
    this.setValue(field, next);
  }

  /** O universo como está na tela (mesmo sem salvar), para dar contexto às sugestões da IA. */
  readonly universeContext = (): ContextLine[] => {
    const form = this.form();
    const lines: ContextLine[] = [{ label: 'Nome do universo', text: this.draft().name }];
    if (form) {
      for (const line of universePortrait(form, this.draft().details, this.universe()?.mapUrl ?? null)) {
        lines.push({ label: line.tab, text: line.text.slice(0, 2000) });
      }
    }
    return lines.slice(0, 40);
  };

  /** Dado: sorteia só o que está vazio no passo. */
  roll(step: UniverseStep): void {
    const form = this.form();
    if (!form) {
      return;
    }
    const rolled = rollEmpty(step, plainValues(form, this.draft().details));
    this.draft.update((d) => ({ ...d, details: { ...d.details, ...rolled } }));
  }

  // ===== Coleções (magias, leis) =====

  addItem(): void {
    const key = this.step()?.collection;
    const collection = this.collection();
    if (!key || !collection || this.items().length >= collection.max) {
      return;
    }
    const item: UniverseItem = { id: newItemId() };
    this.draft.update((d) => ({ ...d, details: withItems(d.details, key, [...itemsOf(d.details, key), item]) }));
    this.openItem.set(item.id);
  }

  toggleItem(item: UniverseItem): void {
    this.openItem.update((open) => (open === item.id ? null : item.id));
  }

  itemValue(item: UniverseItem, field: AppearanceField): AppearanceValue | undefined {
    return field.key === 'id' ? undefined : item[field.key];
  }

  setItemValue(item: UniverseItem, field: AppearanceField, value: AppearanceValue | null): void {
    this.updateItem(item.id, (current) => withItemValue(current, field.key, value));
  }

  rollItem(item: UniverseItem): void {
    const collection = this.collection();
    if (!collection) {
      return;
    }
    this.updateItem(item.id, (current) => {
      const { id, ...values } = current;
      return { ...rollEmpty({ key: 'item', label: '', fields: collection.fields }, values), id } as UniverseItem;
    });
  }

  confirmRemoveItem(item: UniverseItem, index: number): void {
    const collection = this.collection();
    if (!collection) {
      return;
    }
    this.confirm.confirm({
      header: `Excluir "${itemTitle(collection, item, index)}"?`,
      message: 'Só sai do universo depois de salvar; até lá, "Descartar" traz de volta.',
      acceptLabel: 'Excluir',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text p-button-secondary',
      accept: () => this.removeItem(item),
    });
  }

  private removeItem(item: UniverseItem): void {
    const key = this.step()?.collection;
    if (!key) {
      return;
    }
    this.draft.update((d) => ({
      ...d,
      details: withItems(
        d.details,
        key,
        itemsOf(d.details, key).filter((i) => i.id !== item.id),
      ),
    }));
  }

  private updateItem(id: string, change: (item: UniverseItem) => UniverseItem): void {
    const key = this.step()?.collection;
    if (!key) {
      return;
    }
    this.draft.update((d) => ({
      ...d,
      details: withItems(
        d.details,
        key,
        itemsOf(d.details, key).map((i) => (i.id === id ? change(i) : i)),
      ),
    }));
  }

  // ===== Lugares do mapa =====

  async loadPlaces(): Promise<void> {
    try {
      this.places.set(await firstValueFrom(this.api.listPlaces(this.universeId())));
    } catch {
      this.places.set([]); // o construtor funciona sem a lista; os pontos só não aparecem
    }
  }

  // ===== Mapa (enviado na hora) =====

  async onMapSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    this.uploadingMap.set(true);
    try {
      const image = await compressImage(file, 2400, 0.9);
      const universe = await firstValueFrom(this.api.setUniverseMap(this.universeId(), image));
      // Só a imagem e a versão mudam: o que está sendo editado continua no rascunho
      this.universe.set(universe);
      this.toast.add({ severity: 'success', summary: 'Mapa salvo', life: 2500 });
    } catch (error) {
      this.toast.add({
        severity: 'error',
        summary: error instanceof Error && !problemOf(error) ? error.message : problemMessage(error),
        life: 6000,
      });
    } finally {
      this.uploadingMap.set(false);
    }
  }

  confirmRemoveMap(): void {
    this.confirm.confirm({
      header: 'Tirar o mapa?',
      message: 'A imagem é apagada. As regiões e distâncias escritas continuam.',
      acceptLabel: 'Tirar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text p-button-secondary',
      accept: () => void this.removeMap(),
    });
  }

  private async removeMap(): Promise<void> {
    try {
      this.universe.set(await firstValueFrom(this.api.removeUniverseMap(this.universeId())));
    } catch (error) {
      this.toast.add({ severity: 'error', summary: problemMessage(error) });
    }
  }

  // ===== Salvar =====

  async save(): Promise<void> {
    const universe = this.universe();
    const draft = this.draft();
    if (!universe || !draft.name.trim()) {
      return;
    }
    this.saving.set(true);
    try {
      const saved = await firstValueFrom(
        this.api.saveUniverse(universe.id, { version: universe.version, name: draft.name, details: draft.details }),
      );
      this.reset(saved);
      this.toast.add({ severity: 'success', summary: 'Universo salvo', life: 2500 });
    } catch (error) {
      if (problemOf(error)?.code === 'universe_version_conflict') {
        this.conflict.set(true);
      } else {
        this.toast.add({ severity: 'error', summary: problemMessage(error), life: 6000 });
      }
    } finally {
      this.saving.set(false);
    }
  }

  discard(): void {
    const universe = this.universe();
    if (universe) {
      this.reset(universe);
    }
  }
}
