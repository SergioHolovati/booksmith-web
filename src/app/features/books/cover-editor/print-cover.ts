import { Component, DestroyRef, ElementRef, computed, effect, inject, input, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { firstValueFrom } from 'rxjs';

import { ExportApi } from '../../../core/api/export.api';
import { ManuscriptApi } from '../../../core/api/manuscript.api';
import { problemMessage } from '../../../core/api/problem';
import { UniverseApi } from '../../../core/api/universe.api';
import { BookDetail, PrintCoverSpec, PrintProfile } from '../../../core/models/api.models';
import { saveFile } from '../../../core/util/save-file';
import { PRINT_PX_PER_MM, drawPrintCover, printSize } from './print-cover-canvas';

export const PROFILES: { value: PrintProfile; label: string; hint: string }[] = [
  { value: 'kdp-white', label: 'KDP, papel branco', hint: 'Amazon, miolo preto e branco' },
  { value: 'kdp-cream', label: 'KDP, papel creme', hint: 'Amazon, o mais comum em romance' },
  { value: 'kdp-color-premium', label: 'KDP, colorido premium', hint: 'Amazon, miolo colorido' },
  { value: 'custom', label: 'Outra gráfica', hint: 'Clube de Autores, UICLAP, gráfica local' },
];

/** "12,5" ou "12.5" → 12.5; vazio ou inválido → null. */
export function parseMm(text: string): number | null {
  const value = Number.parseFloat(text.trim().replace(',', '.'));
  return Number.isFinite(value) && value >= 0 ? value : null;
}

/** "315,4 × 216,4 mm". */
export function mm(value: number): string {
  return value.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
}

/**
 * Capa para gráfica (`/books/:id/capa/grafica`): a capa aberta (contracapa + lombada + frente) nas medidas do
 * destino. A lombada sai do número de páginas do PDF diagramado; o PDF da capa é montado no servidor a partir da
 * imagem desenhada aqui em 300 DPI.
 */
@Component({
  selector: 'app-print-cover',
  imports: [RouterLink, ButtonModule, InputTextModule, MessageModule, ProgressSpinnerModule],
  templateUrl: './print-cover.html',
  styleUrl: './print-cover.scss',
})
export class PrintCoverComponent {
  private readonly api = inject(ManuscriptApi);
  private readonly exportApi = inject(ExportApi);
  private readonly universeApi = inject(UniverseApi);

  readonly bookId = input.required<string>();
  private readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>('canvas');

  readonly profiles = PROFILES;
  readonly mm = mm;
  readonly book = signal<BookDetail | null>(null);
  readonly loadError = signal<string | null>(null);
  readonly profile = signal<PrintProfile>('kdp-cream');
  readonly spineMm = signal<number | null>(null);
  readonly bleedMm = signal<number | null>(3);
  readonly spec = signal<PrintCoverSpec | null>(null);
  readonly specError = signal<string | null>(null);
  readonly loadingSpec = signal(false);
  readonly generating = signal(false);
  readonly generateError = signal<string | null>(null);
  readonly fontsReady = signal(false);
  private readonly background = signal<HTMLImageElement | null>(null);

  /** Escala da prévia: a capa aberta cabe em ~700 px de largura. */
  readonly previewScale = computed(() => {
    const spec = this.spec();
    return spec ? 700 / spec.widthMm : 1;
  });
  readonly previewSize = computed(() => {
    const spec = this.spec();
    return spec ? printSize(spec, this.previewScale()) : { width: 0, height: 0 };
  });

  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.timer));
    queueMicrotask(() => void this.load());
    void Promise.all(['600 100px Literata', '400 100px Literata', '600 100px Inter', '400 100px Inter'].map((f) => document.fonts.load(f)))
      .catch(() => undefined)
      .then(() => this.fontsReady.set(true));
    effect(() => {
      const canvas = this.canvas()?.nativeElement;
      const spec = this.spec();
      const design = this.book()?.coverDesign;
      const image = this.background();
      this.fontsReady();
      const size = this.previewSize();
      if (!canvas || !spec || !design) {
        return;
      }
      canvas.width = size.width;
      canvas.height = size.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        drawPrintCover(ctx, design, image, spec, { pxPerMm: this.previewScale(), guides: true });
      }
    });
  }

  async load(): Promise<void> {
    this.loadError.set(null);
    try {
      const book = await firstValueFrom(this.api.getBook(this.bookId()));
      this.book.set(book);
      const imageId = book.coverDesign?.imageId;
      if (imageId && book.universeId) {
        const images = await firstValueFrom(this.universeApi.listImages(book.universeId));
        this.loadBackground(images.find((i) => i.id === imageId)?.url ?? null);
      }
      if (book.coverDesign && book.chapters.length > 0) {
        void this.fetchSpec();
      }
    } catch (error) {
      this.loadError.set(problemMessage(error, 'Não foi possível abrir o livro.'));
    }
  }

  private loadBackground(url: string | null): void {
    if (!url) {
      return;
    }
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => this.background.set(image);
    image.src = url;
  }

  chooseProfile(profile: PrintProfile): void {
    this.profile.set(profile);
    this.spec.set(null);
    this.specError.set(null);
    if (profile !== 'custom' || this.spineMm()) {
      void this.fetchSpec();
    }
  }

  /** Medida digitada ("12,5" ou "12.5"): espera parar de digitar antes de pedir as medidas de novo. */
  setCustom(key: 'spine' | 'bleed', text: string): void {
    (key === 'spine' ? this.spineMm : this.bleedMm).set(parseMm(text));
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      if (this.spineMm()) {
        void this.fetchSpec();
      }
    }, 500);
  }

  async fetchSpec(): Promise<void> {
    const custom = this.profile() === 'custom';
    this.loadingSpec.set(true);
    this.specError.set(null);
    try {
      this.spec.set(
        await firstValueFrom(
          this.exportApi.printCoverSpec(this.bookId(), this.profile(), custom ? this.spineMm() : null, custom ? this.bleedMm() : null),
        ),
      );
    } catch (error) {
      this.spec.set(null);
      this.specError.set(problemMessage(error, 'Não foi possível calcular as medidas.'));
    } finally {
      this.loadingSpec.set(false);
    }
  }

  /** Desenha em 300 DPI fora da tela (sem as linhas-guia) e manda para virar PDF. */
  async generate(): Promise<void> {
    const spec = this.spec();
    const design = this.book()?.coverDesign;
    if (!spec || !design) {
      return;
    }
    this.generating.set(true);
    this.generateError.set(null);
    try {
      const size = printSize(spec, PRINT_PX_PER_MM);
      const canvas = document.createElement('canvas');
      canvas.width = size.width;
      canvas.height = size.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('canvas');
      }
      drawPrintCover(ctx, design, this.background(), spec, { pxPerMm: PRINT_PX_PER_MM, guides: false });
      const custom = this.profile() === 'custom';
      const file = await firstValueFrom(
        this.exportApi.printCover(this.bookId(), {
          profile: this.profile(),
          spineMm: custom ? this.spineMm() : null,
          bleedMm: custom ? this.bleedMm() : null,
          image: canvas.toDataURL('image/jpeg', 0.92),
        }),
      );
      saveFile(file);
    } catch (error) {
      this.generateError.set(problemMessage(error, 'Não foi possível gerar a capa. Tente de novo.'));
    } finally {
      this.generating.set(false);
    }
  }
}
