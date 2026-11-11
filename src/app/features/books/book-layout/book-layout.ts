import { Component, DestroyRef, HostListener, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { firstValueFrom } from 'rxjs';

import { ExportApi } from '../../../core/api/export.api';
import { ManuscriptApi } from '../../../core/api/manuscript.api';
import { problemMessage } from '../../../core/api/problem';
import { BookDetail, BookLayout } from '../../../core/models/api.models';
import { HasUnsavedChanges } from '../../../core/util/unsaved-changes.guard';

export const DEFAULT_LAYOUT: BookLayout = {
  trim: 'a5',
  fontSize: 11,
  leading: 'normal',
  margins: 'normal',
  chapterStyle: 'classic',
  sceneBreak: 'asterisks',
};

interface Choice<K extends keyof BookLayout> {
  key: K;
  label: string;
  options: { value: BookLayout[K]; label: string }[];
}

/** As opções de cada escolha, na ordem da tela. */
export const CHOICES = [
  {
    key: 'trim',
    label: 'Tamanho',
    options: [
      { value: 'a5', label: 'A5' },
      { value: '14x21', label: '14×21' },
      { value: '16x23', label: '16×23' },
      { value: '6x9', label: '6×9"' },
    ],
  } as Choice<'trim'>,
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
];

/** Modelos prontos: um toque muda tudo; depois dá para ajustar cada escolha. */
export const MODELS: { name: string; hint: string; layout: BookLayout }[] = [
  { name: 'Clássico', hint: 'Romance tradicional', layout: DEFAULT_LAYOUT },
  {
    name: 'Moderno',
    hint: 'Arejado, títulos à esquerda',
    layout: { trim: '14x21', fontSize: 11, leading: 'airy', margins: 'normal', chapterStyle: 'modern', sceneBreak: 'diamond' },
  },
  {
    name: 'Econômico',
    hint: 'Menos páginas para imprimir',
    layout: { trim: '16x23', fontSize: 10.5, leading: 'compact', margins: 'narrow', chapterStyle: 'simple', sceneBreak: 'dots' },
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
  imports: [RouterLink, ButtonModule, ProgressSpinnerModule],
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

  useModel(layout: BookLayout): void {
    this.apply({ ...layout });
  }

  /** Nova diagramação: as páginas mudam, então a prévia recomeça (sem perder a página em que se estava). */
  private apply(layout: BookLayout): void {
    this.layout.set(layout);
    this.images.set({});
    clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.fetch(this.page()), 400);
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
