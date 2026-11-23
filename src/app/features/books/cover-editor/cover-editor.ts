import { Component, ElementRef, HostListener, computed, effect, inject, input, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SliderModule } from 'primeng/slider';
import { TextareaModule } from 'primeng/textarea';
import { firstValueFrom } from 'rxjs';

import { ManuscriptApi } from '../../../core/api/manuscript.api';
import { problemMessage } from '../../../core/api/problem';
import { UniverseApi } from '../../../core/api/universe.api';
import { AuthService } from '../../../core/auth/auth.service';
import { BookDetail, CoverDesign, IllustrationResult, UniverseImage } from '../../../core/models/api.models';
import { IllustrationStudioComponent } from '../../../shared/illustration-studio/illustration-studio';
import { HasUnsavedChanges } from '../../../core/util/unsaved-changes.guard';
import { compressForPrint, pageTitle } from '../illustration-pages';
import { COVER_WIDTH, coverHeight, drawCover } from './cover-canvas';

export const TEMPLATES: { value: CoverDesign['template']; label: string }[] = [
  { value: 'classic', label: 'Clássica' },
  { value: 'band', label: 'Faixa' },
  { value: 'minimal', label: 'Minimalista' },
];

/** Cores de fundo e de faixa: escuras e quentes, que funcionam com texto claro. */
export const BACKGROUNDS = ['#1f2a44', '#2d1b2e', '#123524', '#3b1f12', '#111111', '#5a2a27', '#e9dfc9', '#f4f1ea'];
export const TEXT_COLORS = ['#ffffff', '#f4e4c1', '#c8743a', '#111111', '#1f2a44'];

/** O desenho inicial: o título do livro e o nome de quem escreve, sobre azul-noite; a sinopse na contracapa. */
export function initialDesign(title: string, author: string | null, synopsis: string | null = null): CoverDesign {
  return {
    template: 'classic',
    backgroundColor: '#1f2a44',
    imageId: null,
    shade: 30,
    title,
    subtitle: null,
    author,
    font: 'serif',
    titleSize: 'm',
    textColor: '#ffffff',
    accentColor: '#c8743a',
    backText: synopsis?.trim() || null,
  };
}

/** Cor clara pede texto escuro: ao trocar o fundo para claro, o texto acompanha (e vice-versa). */
export function isLight(hex: string): boolean {
  const n = Number.parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.299 * r + 0.587 * g + 0.114 * b > 160;
}

/**
 * Editor de capa (`/books/:id/capa`): modelo, fundo (cor ou imagem da biblioteca do universo), textos, letra e
 * cores, desenhados num canvas no tamanho final. "Usar como capa" guarda a imagem como capa do livro (ePub, PDF e
 * telas do app) e o desenho, para editar depois.
 */
@Component({
  selector: 'app-cover-editor',
  imports: [RouterLink, FormsModule, ButtonModule, InputTextModule, ProgressSpinnerModule, SliderModule, TextareaModule,
    IllustrationStudioComponent],
  templateUrl: './cover-editor.html',
  styleUrl: './cover-editor.scss',
})
export class CoverEditorComponent implements HasUnsavedChanges {
  private readonly api = inject(ManuscriptApi);
  private readonly universeApi = inject(UniverseApi);
  private readonly toast = inject(MessageService);
  private readonly auth = inject(AuthService);

  readonly bookId = input.required<string>();
  private readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>('canvas');

  readonly templates = TEMPLATES;
  readonly backgrounds = BACKGROUNDS;
  readonly textColors = TEXT_COLORS;
  readonly width = COVER_WIDTH;

  readonly book = signal<BookDetail | null>(null);
  readonly loadError = signal<string | null>(null);
  readonly images = signal<UniverseImage[]>([]);
  /** Estúdio Visual: a arte da capa com IA (só no livro concluído). */
  readonly studioOpen = signal(false);
  readonly bookComplete = computed(() => this.book()?.status === 'COMPLETE');
  readonly design = signal<CoverDesign>(initialDesign('', null));
  private readonly saved = signal<string>('');
  readonly saving = signal(false);
  /** Enviando a imagem da capa pronta. */
  readonly uploading = signal(false);
  /** Importando (ou tirando) a capa pronta em PDF. */
  readonly importingPdf = signal(false);
  /** Com capa em PDF: fazendo outra (com IA ou imagem), que substitui o PDF ao salvar. */
  readonly replacing = signal(false);
  /** Com capa em PDF, o editor só aparece para fazer outra capa. */
  readonly showEditor = computed(() => !this.book()?.coverPdf || this.replacing());
  /** Título, subtítulo e autor escritos na frente (não, quando a imagem já traz o título). */
  readonly frontText = computed(() => this.design().frontText !== false);
  readonly fontsReady = signal(false);
  /** Imagem de fundo carregada (null = sem imagem, ou ainda carregando). */
  private readonly background = signal<HTMLImageElement | null>(null);

  readonly dirty = computed(() => this.saved() !== '' && JSON.stringify(this.design()) !== this.saved());
  /** A capa do livro já é este desenho (salvo e sem mudanças). */
  readonly applied = computed(() => !!this.book()?.coverDesign && !this.book()?.coverPdf && !this.dirty());
  readonly canSave = computed(() => this.design().title.trim() !== '' && this.fontsReady());

  constructor() {
    queueMicrotask(() => void this.load());
    void this.loadFonts();
    // Redesenha a cada mudança (o canvas tem o tamanho final; o CSS só o reduz na tela)
    effect(() => {
      const canvas = this.canvas()?.nativeElement;
      const design = this.design();
      const image = this.background();
      this.fontsReady();
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx) {
        // A altura muda com a capa pronta em imagem (mudar a altura apaga o canvas: vem antes de desenhar)
        const height = coverHeight(design, image);
        if (canvas.height !== height) {
          canvas.height = height;
        }
        drawCover(ctx, design, image, { x: 0, y: 0, w: COVER_WIDTH, h: height });
      }
    });
    effect(() => {
      const id = this.design().imageId;
      const url = this.images().find((i) => i.id === id)?.url ?? null;
      this.loadBackground(url);
    });
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

  /** O canvas só usa a fonte se ela já estiver carregada; sem isso, sai a fonte padrão do sistema. */
  private async loadFonts(): Promise<void> {
    try {
      await Promise.all(
        ['600 100px Literata', 'italic 400 100px Literata', '400 100px Literata', '600 100px Inter', '400 100px Inter'].map(
          (font) => document.fonts.load(font),
        ),
      );
    } catch {
      // sem as fontes da web, desenha com as do sistema
    }
    this.fontsReady.set(true);
  }

  async load(): Promise<void> {
    this.loadError.set(null);
    try {
      const book = await firstValueFrom(this.api.getBook(this.bookId()));
      this.book.set(book);
      const design = book.coverDesign ?? initialDesign(book.title, this.auth.user()?.displayName ?? null, book.synopsis);
      this.design.set(design);
      this.saved.set(JSON.stringify(design));
      if (book.universeId) {
        this.images.set(await firstValueFrom(this.universeApi.listImages(book.universeId)));
      }
    } catch (error) {
      this.loadError.set(problemMessage(error, 'Não foi possível abrir o livro.'));
    }
  }

  private loadBackground(url: string | null): void {
    if (!url) {
      this.background.set(null);
      return;
    }
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => this.background.set(image);
    image.onerror = () => this.background.set(null);
    image.src = url;
  }

  /** Arte gerada: entra na biblioteca e vira o fundo da capa; o título continua por cima. */
  async onArtwork(result: IllustrationResult): Promise<void> {
    const universeId = this.book()?.universeId;
    if (universeId) {
      try {
        this.images.set(await firstValueFrom(this.universeApi.listImages(universeId)));
      } catch {
        // a lista antiga continua valendo; a imagem nova ainda assim é escolhida abaixo
      }
    }
    // A arte da IA vem sem letras: o título volta a ser escrito por cima
    this.design.update((design) => ({ ...design, imageId: result.imageId, frontText: true, shade: design.shade || 30 }));
    this.replacing.set(true);
  }

  /** Desiste da capa nova: volta para a capa em PDF (e o desenho salvo). */
  cancelReplace(): void {
    const saved = this.saved();
    if (saved) {
      this.design.set(JSON.parse(saved) as CoverDesign);
    }
    this.replacing.set(false);
  }

  /**
   * Sem texto na frente, a imagem é a capa inteira: sem escurecer. Com texto de novo, volta o escurecimento padrão
   * (para o título aparecer sobre a imagem).
   */
  setFrontText(on: boolean): void {
    this.design.update((design) => ({ ...design, frontText: on, shade: on ? (design.shade || 30) : 0 }));
  }

  /** A capa pronta numa imagem (com o título): entra na biblioteca do universo e vira a frente, sem texto por cima. */
  async uploadCover(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    const universeId = this.book()?.universeId;
    if (!file || !universeId) {
      return;
    }
    this.uploading.set(true);
    try {
      const art = await compressForPrint(file);
      const image = await firstValueFrom(this.universeApi.uploadImage(universeId, art.dataUrl, `Capa: ${pageTitle(file.name)}`, []));
      this.images.update((list) => [image, ...list]);
      this.design.update((design) => ({ ...design, imageId: image.id, frontText: false, shade: 0 }));
      this.replacing.set(true);
    } catch (error) {
      this.toast.add({ severity: 'error', summary: problemMessage(error, 'Não foi possível enviar a imagem.'), life: 6000 });
    } finally {
      this.uploading.set(false);
    }
  }

  /**
   * A capa pronta em PDF vira a capa do livro (a frente, no app, no ePub e no PDF; a capa aberta fica para a
   * gráfica). O tamanho do livro é o da diagramação: com ele, a importação acha o corte.
   */
  async importPdf(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    const book = this.book();
    if (!file || !book) {
      return;
    }
    this.importingPdf.set(true);
    try {
      const result = await firstValueFrom(
        this.api.importCoverPdf(book.id, file, { trim: book.layout.trim, spineMm: null, bleedMm: null }),
      );
      this.book.update((current) => (current ? { ...current, coverUrl: result.coverUrl, coverPdf: result.coverPdf } : current));
      this.cancelReplace();
      this.toast.add({ severity: 'success', summary: 'Capa importada', life: 4000,
        detail: result.coverPdf.kind === 'wrap'
          ? 'A frente virou a capa do livro; confira a lombada em Capa para gráfica.'
          : 'Já vale no livro e nos arquivos baixados.' });
    } catch (error) {
      this.toast.add({ severity: 'error', summary: problemMessage(error, 'Não foi possível importar o PDF.'), life: 6000 });
    } finally {
      this.importingPdf.set(false);
    }
  }

  /** Tira o PDF: a capa do livro continua a imagem da frente até salvar um desenho. */
  async removePdf(): Promise<void> {
    this.importingPdf.set(true);
    try {
      await firstValueFrom(this.api.removeCoverPdf(this.bookId()));
      this.book.update((book) => (book ? { ...book, coverPdf: null } : book));
    } catch (error) {
      this.toast.add({ severity: 'error', summary: problemMessage(error, 'Não foi possível tirar o PDF.'), life: 6000 });
    } finally {
      this.importingPdf.set(false);
    }
  }

  set<K extends keyof CoverDesign>(key: K, value: CoverDesign[K]): void {
    this.design.update((design) => ({ ...design, [key]: value }));
  }

  /** Fundo novo: se o contraste com o texto ficaria ruim, o texto troca de claro para escuro (ou o contrário). */
  setBackground(color: string): void {
    this.design.update((design) => {
      const next = { ...design, backgroundColor: color };
      if (!design.imageId && isLight(color) === isLight(design.textColor)) {
        next.textColor = isLight(color) ? '#111111' : '#ffffff';
      }
      return next;
    });
  }

  setText(key: 'title' | 'subtitle' | 'author' | 'backText', value: string): void {
    this.set(key, key === 'title' ? value : value.trim() === '' ? null : value);
  }

  async save(): Promise<void> {
    const canvas = this.canvas()?.nativeElement;
    if (!canvas || !this.canSave()) {
      return;
    }
    this.saving.set(true);
    try {
      const image = canvas.toDataURL('image/jpeg', 0.9);
      const result = await firstValueFrom(this.api.saveCover(this.bookId(), this.design(), image));
      this.book.update((book) => (book ? { ...book, coverUrl: result.coverUrl, coverDesign: result.design, coverPdf: null } : book));
      this.replacing.set(false);
      this.saved.set(JSON.stringify(this.design()));
      this.toast.add({ severity: 'success', summary: 'Capa salva', detail: 'Já vale no livro e nos arquivos baixados.', life: 3000 });
    } catch (error) {
      this.toast.add({ severity: 'error', summary: problemMessage(error), life: 6000 });
    } finally {
      this.saving.set(false);
    }
  }
}
