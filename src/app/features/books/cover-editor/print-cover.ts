import {
  Component,
  DestroyRef,
  ElementRef,
  WritableSignal,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { firstValueFrom } from 'rxjs';

import { ExportApi } from '../../../core/api/export.api';
import { ManuscriptApi } from '../../../core/api/manuscript.api';
import { problemMessage } from '../../../core/api/problem';
import { UniverseApi } from '../../../core/api/universe.api';
import { AuthService } from '../../../core/auth/auth.service';
import { BookDetail, CoverDesign, PrintCoverSpec, PrintProfile } from '../../../core/models/api.models';
import { saveFile } from '../../../core/util/save-file';
import { initialDesign } from './cover-editor';
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
  imports: [RouterLink, FormsModule, TextareaModule, ButtonModule, InputTextModule, MessageModule, ProgressSpinnerModule],
  templateUrl: './print-cover.html',
  styleUrl: './print-cover.scss',
})
export class PrintCoverComponent {
  private readonly api = inject(ManuscriptApi);
  private readonly exportApi = inject(ExportApi);
  private readonly universeApi = inject(UniverseApi);
  private readonly auth = inject(AuthService);

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
  /** A frente vinda do PDF importado (a imagem de capa do livro), para a prévia e o desenho em 300 DPI. */
  private readonly frontImage = signal<HTMLImageElement | null>(null);
  readonly importing = signal(false);
  readonly importError = signal<string | null>(null);
  /** Texto da contracapa editado aqui (capa importada em PDF, sem o editor de capa). */
  readonly backText = signal('');

  /** O desenho: o salvo, ou o inicial (capa importada sem desenho). O texto da contracapa é o desta tela. */
  readonly design = computed<CoverDesign | null>(() => {
    const book = this.book();
    if (!book) {
      return null;
    }
    const base = book.coverDesign ?? initialDesign(book.title, this.auth.user()?.displayName ?? null, book.synopsis);
    return { ...base, backText: this.backText().trim() || null };
  });
  readonly coverPdf = computed(() => this.book()?.coverPdf ?? null);
  readonly canUse = computed(() => !!this.book()?.coverDesign || !!this.coverPdf());

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
      const design = this.design();
      const image = this.background();
      const frontImage = this.coverPdf()?.kind === 'front' ? this.frontImage() : null;
      this.fontsReady();
      const size = this.previewSize();
      if (!canvas || !spec || !design) {
        return;
      }
      canvas.width = size.width;
      canvas.height = size.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        drawPrintCover(ctx, design, image, spec, { pxPerMm: this.previewScale(), guides: true, frontImage });
      }
    });
  }

  async load(): Promise<void> {
    this.loadError.set(null);
    try {
      const book = await firstValueFrom(this.api.getBook(this.bookId()));
      this.book.set(book);
      this.backText.set(book.coverDesign?.backText ?? book.synopsis ?? '');
      const imageId = book.coverDesign?.imageId;
      if (imageId && book.universeId) {
        const images = await firstValueFrom(this.universeApi.listImages(book.universeId));
        this.loadImage(images.find((i) => i.id === imageId)?.url ?? null, this.background);
      }
      this.loadImage(book.coverPdf ? book.coverUrl : null, this.frontImage);
      if ((book.coverDesign || book.coverPdf) && book.chapters.length > 0) {
        void this.fetchSpec();
      }
    } catch (error) {
      this.loadError.set(problemMessage(error, 'Não foi possível abrir o livro.'));
    }
  }

  private loadImage(url: string | null, target: WritableSignal<HTMLImageElement | null>): void {
    if (!url) {
      target.set(null);
      return;
    }
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => target.set(image);
    image.src = url;
  }

  /** Capa feita fora do app, em PDF: só a frente ou a capa aberta. */
  async importPdf(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    this.importing.set(true);
    this.importError.set(null);
    try {
      const result = await firstValueFrom(this.api.importCoverPdf(this.bookId(), file));
      this.book.update((book) => (book ? { ...book, coverUrl: result.coverUrl, coverPdf: result.coverPdf } : book));
      this.loadImage(result.coverPdf.kind === 'front' ? result.coverUrl : null, this.frontImage);
      if ((this.book()?.chapters.length ?? 0) > 0 && (this.profile() !== 'custom' || this.spineMm())) {
        void this.fetchSpec();
      }
    } catch (error) {
      this.importError.set(problemMessage(error, 'Não foi possível importar o PDF.'));
    } finally {
      this.importing.set(false);
    }
  }

  async removePdf(): Promise<void> {
    try {
      await firstValueFrom(this.api.removeCoverPdf(this.bookId()));
      this.book.update((book) => (book ? { ...book, coverPdf: null } : book));
      this.frontImage.set(null);
      if (this.book()?.coverDesign) {
        void this.fetchSpec();
      } else {
        this.spec.set(null);
      }
    } catch (error) {
      this.importError.set(problemMessage(error, 'Não foi possível tirar o PDF.'));
    }
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

  /**
   * Desenha em 300 DPI fora da tela (sem as linhas-guia) e manda para virar PDF. Capa aberta importada que bate
   * com as medidas sai como veio, sem desenho.
   */
  async generate(): Promise<void> {
    const spec = this.spec();
    const design = this.design();
    if (!spec || !design) {
      return;
    }
    this.generating.set(true);
    this.generateError.set(null);
    try {
      const pdf = this.coverPdf();
      if (pdf?.kind === 'front') {
        // O texto da contracapa editado aqui fica guardado no livro
        const saved = await firstValueFrom(this.api.saveCoverDesign(this.bookId(), design));
        this.book.update((book) => (book ? { ...book, coverDesign: saved } : book));
      }
      const custom = this.profile() === 'custom';
      if (pdf?.kind === 'wrap') {
        saveFile(
          await firstValueFrom(
            this.exportApi.printCover(this.bookId(), {
              profile: this.profile(),
              spineMm: custom ? this.spineMm() : null,
              bleedMm: custom ? this.bleedMm() : null,
              image: '',
            }),
          ),
        );
        return;
      }
      const size = printSize(spec, PRINT_PX_PER_MM);
      const canvas = document.createElement('canvas');
      canvas.width = size.width;
      canvas.height = size.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('canvas');
      }
      drawPrintCover(ctx, design, this.background(), spec, {
        pxPerMm: PRINT_PX_PER_MM,
        guides: false,
        frontImage: pdf?.kind === 'front' ? this.frontImage() : null,
      });
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
