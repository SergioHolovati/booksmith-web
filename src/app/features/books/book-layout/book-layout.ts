import { Component, DestroyRef, HostListener, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { firstValueFrom } from 'rxjs';

import { ExportApi } from '../../../core/api/export.api';
import { ManuscriptApi } from '../../../core/api/manuscript.api';
import { problemMessage } from '../../../core/api/problem';
import { BookDetail, BookLayout, BookTrim } from '../../../core/models/api.models';
import { trimSize } from '../../../core/util/print-geometry';
import { HasUnsavedChanges } from '../../../core/util/unsaved-changes.guard';
import { printCheckSummary } from '../print-check';

export const DEFAULT_LAYOUT: BookLayout = {
  trim: 'a5',
  fontSize: 11,
  leading: 'normal',
  margins: 'normal',
  chapterStyle: 'classic',
  sceneBreak: 'asterisks',
  customWidthMm: null,
  customHeightMm: null,
  bleed: false,
};

export type Orientation = 'portrait' | 'square' | 'landscape' | 'custom';

/** Os tamanhos de página, pelo formato do livro. Os do KDP estão marcados. */
export const TRIM_GROUPS: { value: Orientation; label: string; trims: { value: BookTrim; label: string }[] }[] = [
  {
    value: 'portrait',
    label: 'Em pé',
    trims: [
      { value: 'a5', label: 'A5' },
      { value: '14x21', label: '14×21' },
      { value: '16x23', label: '16×23' },
      { value: '6x9', label: '6×9" KDP' },
    ],
  },
  {
    value: 'square',
    label: 'Quadrado',
    trims: [
      { value: '15x15', label: '15×15' },
      { value: '20x20', label: '20×20' },
      { value: '21x21', label: '21×21' },
      { value: '25x25', label: '25×25' },
      { value: '8.5x8.5', label: '8,5×8,5" KDP' },
      { value: '8.25x8.25', label: '8,25×8,25" KDP' },
    ],
  },
  {
    value: 'landscape',
    label: 'Deitado',
    trims: [
      { value: '21x15', label: '21×15' },
      { value: '25x20', label: '25×20' },
      { value: '28x21', label: '28×21' },
      { value: '8.25x6', label: '8,25×6" KDP' },
    ],
  },
  { value: 'custom', label: 'Personalizado', trims: [] },
];

export const CUSTOM_MIN_MM = 100;
export const CUSTOM_MAX_MM = 330;

export function orientationOf(trim: BookTrim): Orientation {
  return TRIM_GROUPS.find((g) => g.trims.some((t) => t.value === trim))?.value ?? 'custom';
}

/** "A5", "20×20", "Personalizado 230×180 mm". */
export function trimLabel(layout: BookLayout): string {
  if (layout.trim === 'custom') {
    const [w, h] = trimSize(layout);
    return `Personalizado ${String(w).replace('.', ',')}×${String(h).replace('.', ',')} mm`;
  }
  return TRIM_GROUPS.flatMap((g) => g.trims).find((t) => t.value === layout.trim)?.label ?? layout.trim;
}

interface Choice<K extends keyof BookLayout> {
  key: K;
  label: string;
  options: { value: BookLayout[K]; label: string }[];
}

/** As opções de cada escolha, na ordem da tela. */
export const CHOICES = [
  {
    key: 'fontSize',
    label: 'Letra',
    options: [10, 10.5, 11, 11.5, 12].map((size) => ({ value: size, label: String(size).replace('.', ',') })),
  } as Choice<'fontSize'>,
  {
    key: 'leading',
    label: 'Espaço entre linhas',
    options: [
      { value: 'compact', label: 'Justo' },
      { value: 'normal', label: 'Normal' },
      { value: 'airy', label: 'Arejado' },
    ],
  } as Choice<'leading'>,
  {
    key: 'margins',
    label: 'Margens',
    options: [
      { value: 'narrow', label: 'Estreitas' },
      { value: 'normal', label: 'Normais' },
      { value: 'wide', label: 'Largas' },
    ],
  } as Choice<'margins'>,
  {
    key: 'chapterStyle',
    label: 'Abertura de capítulo',
    options: [
      { value: 'classic', label: 'Clássica' },
      { value: 'modern', label: 'Moderna' },
      { value: 'simple', label: 'Simples' },
    ],
  } as Choice<'chapterStyle'>,
  {
    key: 'sceneBreak',
    label: 'Quebra de cena',
    options: [
      { value: 'asterisks', label: '* * *' },
      { value: 'asterism', label: '⁂' },
      { value: 'diamond', label: '◆' },
      { value: 'dots', label: '• • •' },
      { value: 'space', label: 'Só espaço' },
    ],
  } as Choice<'sceneBreak'>,
  {
    key: 'bleed',
    label: 'Sangria (imagens até a borda, para a gráfica)',
    options: [
      { value: false, label: 'Sem' },
      { value: true, label: 'Com sangria' },
    ],
  } as Choice<'bleed'>,
];

/** Modelos prontos: um toque muda tudo; depois dá para ajustar cada escolha. */
export const MODELS: { name: string; hint: string; layout: BookLayout }[] = [
  { name: 'Clássico', hint: 'Romance tradicional', layout: DEFAULT_LAYOUT },
  {
    name: 'Moderno',
    hint: 'Arejado, títulos à esquerda',
    layout: { ...DEFAULT_LAYOUT, trim: '14x21', leading: 'airy', chapterStyle: 'modern', sceneBreak: 'diamond' },
  },
  {
    name: 'Econômico',
    hint: 'Menos páginas para imprimir',
    layout: { ...DEFAULT_LAYOUT, trim: '16x23', fontSize: 10.5, leading: 'compact', margins: 'narrow', chapterStyle: 'simple', sceneBreak: 'dots' },
  },
];

export function sameLayout(a: BookLayout, b: BookLayout): boolean {
  return (Object.keys(DEFAULT_LAYOUT) as (keyof BookLayout)[]).every((key) => a[key] === b[key]);
}

/** Só as chaves conhecidas, com o padrão no que faltar (livro antigo). */
export function normalizeLayout(layout: Partial<BookLayout> | null | undefined): BookLayout {
  return { ...DEFAULT_LAYOUT, ...Object.fromEntries(
    Object.entries(layout ?? {}).filter(([key, value]) => key in DEFAULT_LAYOUT && value !== null),
  ) } as BookLayout;
}

/**
 * Diagramação (`/books/:id/diagramacao`): modelos prontos e escolhas de tamanho, letra, entrelinha, margens,
 * abertura de capítulo e quebra de cena, com a prévia das páginas reais do PDF.
 */
@Component({
  selector: 'app-book-layout',
  imports: [RouterLink, ButtonModule, MessageModule, ProgressSpinnerModule],
  templateUrl: './book-layout.html',
  styleUrl: './book-layout.scss',
})
export class BookLayoutComponent implements HasUnsavedChanges {
  private readonly api = inject(ManuscriptApi);
  private readonly exportApi = inject(ExportApi);
  private readonly toast = inject(MessageService);

  readonly bookId = input.required<string>();

  readonly choices = CHOICES;
  readonly models = MODELS;
  readonly trimGroups = TRIM_GROUPS;
  readonly orientation = computed(() => orientationOf(this.layout().trim));
  readonly trimsOfOrientation = computed(() => TRIM_GROUPS.find((g) => g.value === this.orientation())?.trims ?? []);
  readonly customMin = CUSTOM_MIN_MM;
  readonly customMax = CUSTOM_MAX_MM;
  readonly book = signal<BookDetail | null>(null);
  readonly loadError = signal<string | null>(null);
  readonly layout = signal<BookLayout>(DEFAULT_LAYOUT);
  private readonly saved = signal<BookLayout>(DEFAULT_LAYOUT);
  readonly saving = signal(false);

  readonly page = signal(1);
  readonly pageCount = signal<number | null>(null);
  readonly images = signal<Record<number, string>>({});
  readonly previewLoading = signal(false);
  readonly previewError = signal<string | null>(null);
  /** Aviso das ilustrações que saem borradas nesta diagramação (null = nenhuma). */
  readonly printWarning = signal<string | null>(null);
  private checkRequest = 0;

  readonly dirty = computed(() => !sameLayout(this.layout(), this.saved()));
  readonly model = computed(() => MODELS.find((m) => sameLayout(m.layout, this.layout()))?.name ?? null);
  readonly image = computed(() => this.images()[this.page()] ?? null);

  private timer: ReturnType<typeof setTimeout> | undefined;
  /** Pedido mais recente: resposta de um pedido antigo (outra diagramação) é ignorada. */
  private request = 0;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.timer));
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
      const layout = normalizeLayout(book.layout);
      this.book.set(book);
      this.layout.set(layout);
      this.saved.set(layout);
      if (book.chapters.length > 0) {
        void this.fetch(1);
        void this.checkIllustrations();
      }
    } catch (error) {
      this.loadError.set(problemMessage(error, 'Não foi possível abrir o livro.'));
    }
  }

  isOn(key: keyof BookLayout, value: BookLayout[keyof BookLayout]): boolean {
    return this.layout()[key] === value;
  }

  choose(key: keyof BookLayout, value: BookLayout[keyof BookLayout]): void {
    this.apply({ ...this.layout(), [key]: value } as BookLayout);
  }

  /** Em pé, quadrado, deitado: o primeiro tamanho do formato. Personalizado começa com as medidas de agora. */
  chooseOrientation(orientation: Orientation): void {
    if (orientation === this.orientation()) {
      return;
    }
    const current = this.layout();
    if (orientation === 'custom') {
      const [w, h] = trimSize(current);
      this.apply({ ...current, trim: 'custom', customWidthMm: w, customHeightMm: h });
      return;
    }
    const first = TRIM_GROUPS.find((g) => g.value === orientation)!.trims[0].value;
    this.apply({ ...current, trim: first, customWidthMm: null, customHeightMm: null });
  }

  chooseTrim(trim: BookTrim): void {
    this.apply({ ...this.layout(), trim, customWidthMm: null, customHeightMm: null });
  }

  /** Largura ou altura do tamanho personalizado, em mm; fora da faixa, a prévia mostra o motivo. */
  setCustom(dimension: 'customWidthMm' | 'customHeightMm', value: string): void {
    const mm = Number(value.replace(',', '.'));
    if (!Number.isFinite(mm) || mm <= 0) {
      return;
    }
    this.apply({ ...this.layout(), [dimension]: mm });
  }

  useModel(layout: BookLayout): void {
    this.apply({ ...layout });
  }

  /** Nova diagramação: as páginas mudam, então a prévia recomeça (sem perder a página em que se estava). */
  private apply(layout: BookLayout): void {
    this.layout.set(layout);
    this.images.set({});
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      void this.fetch(this.page());
      void this.checkIllustrations();
    }, 400);
  }

  /** O DPI das ilustrações muda com o tamanho da página e as margens. Falhar aqui não atrapalha a prévia. */
  async checkIllustrations(): Promise<void> {
    const id = ++this.checkRequest;
    try {
      const check = await firstValueFrom(this.exportApi.printCheck(this.bookId(), this.layout()));
      if (id === this.checkRequest) {
        const bleed = check.needsBleed
          ? 'Há ilustração até a borda e o livro está sem sangria: para a gráfica, ligue a sangria (3,2 mm).'
          : null;
        const text = [bleed, printCheckSummary(check.illustrations)].filter(Boolean).join(' ');
        this.printWarning.set(text || null);
      }
    } catch {
      // sem a conferência, sem aviso
    }
  }

  go(step: number): void {
    const count = this.pageCount();
    const target = Math.max(1, count ? Math.min(this.page() + step, count) : this.page() + step);
    this.page.set(target);
    if (!this.images()[target]) {
      void this.fetch(target);
    }
  }

  /** Busca a página e a seguinte (para o "próxima" ser na hora). */
  async fetch(from: number): Promise<void> {
    const id = ++this.request;
    this.previewLoading.set(true);
    this.previewError.set(null);
    try {
      const preview = await firstValueFrom(this.exportApi.preview(this.bookId(), this.layout(), from, 2));
      if (id !== this.request) {
        return;
      }
      this.pageCount.set(preview.pageCount);
      if (this.page() > preview.pageCount) {
        // Com letra menor o livro encolhe: a página em que se estava pode não existir mais
        this.page.set(preview.pageCount);
        void this.fetch(preview.pageCount);
        return;
      }
      this.images.update((images) => ({
        ...images,
        ...Object.fromEntries(preview.pages.map((p) => [p.number, p.image])),
      }));
    } catch (error) {
      if (id === this.request) {
        this.previewError.set(problemMessage(error, 'Não foi possível montar a prévia.'));
      }
    } finally {
      if (id === this.request) {
        this.previewLoading.set(false);
      }
    }
  }

  async save(): Promise<void> {
    this.saving.set(true);
    try {
      const layout = normalizeLayout(await firstValueFrom(this.api.updateLayout(this.bookId(), this.layout())));
      this.saved.set(layout);
      this.layout.set(layout);
      this.toast.add({ severity: 'success', summary: 'Diagramação salva', detail: 'O PDF já sai assim.', life: 3000 });
    } catch (error) {
      this.toast.add({ severity: 'error', summary: problemMessage(error), life: 6000 });
    } finally {
      this.saving.set(false);
    }
  }

  discard(): void {
    this.apply({ ...this.saved() });
  }
}
