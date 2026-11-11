import { Component, ElementRef, HostListener, computed, effect, inject, input, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SliderModule } from 'primeng/slider';
import { firstValueFrom } from 'rxjs';

import { ManuscriptApi } from '../../../core/api/manuscript.api';
import { problemMessage } from '../../../core/api/problem';
import { UniverseApi } from '../../../core/api/universe.api';
import { AuthService } from '../../../core/auth/auth.service';
import { BookDetail, CoverDesign, UniverseImage } from '../../../core/models/api.models';
import { HasUnsavedChanges } from '../../../core/util/unsaved-changes.guard';
import { COVER_HEIGHT, COVER_WIDTH, drawCover } from './cover-canvas';

export const TEMPLATES: { value: CoverDesign['template']; label: string }[] = [
  { value: 'classic', label: 'Clássica' },
  { value: 'band', label: 'Faixa' },
  { value: 'minimal', label: 'Minimalista' },
];

/** Cores de fundo e de faixa: escuras e quentes, que funcionam com texto claro. */
export const BACKGROUNDS = ['#1f2a44', '#2d1b2e', '#123524', '#3b1f12', '#111111', '#5a2a27', '#e9dfc9', '#f4f1ea'];
export const TEXT_COLORS = ['#ffffff', '#f4e4c1', '#c8743a', '#111111', '#1f2a44'];

/** O desenho inicial: o título do livro e o nome de quem escreve, sobre azul-noite. */
export function initialDesign(title: string, author: string | null): CoverDesign {
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
  imports: [RouterLink, FormsModule, ButtonModule, InputTextModule, ProgressSpinnerModule, SliderModule],
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
  readonly height = COVER_HEIGHT;

  readonly book = signal<BookDetail | null>(null);
  readonly loadError = signal<string | null>(null);
  readonly images = signal<UniverseImage[]>([]);
  readonly design = signal<CoverDesign>(initialDesign('', null));
  private readonly saved = signal<string>('');
  readonly saving = signal(false);
  readonly fontsReady = signal(false);
  /** Imagem de fundo carregada (null = sem imagem, ou ainda carregando). */
  private readonly background = signal<HTMLImageElement | null>(null);

  readonly dirty = computed(() => this.saved() !== '' && JSON.stringify(this.design()) !== this.saved());
  /** A capa do livro já é este desenho (salvo e sem mudanças). */
  readonly applied = computed(() => !!this.book()?.coverDesign && !this.dirty());
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
      if (ctx) {
        drawCover(ctx, design, image);
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
      const design = book.coverDesign ?? initialDesign(book.title, this.auth.user()?.displayName ?? null);
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

  setText(key: 'title' | 'subtitle' | 'author', value: string): void {
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
      this.book.update((book) => (book ? { ...book, coverUrl: result.coverUrl, coverDesign: result.design } : book));
      this.saved.set(JSON.stringify(this.design()));
      this.toast.add({ severity: 'success', summary: 'Capa salva', detail: 'Já vale no livro e nos arquivos baixados.', life: 3000 });
    } catch (error) {
      this.toast.add({ severity: 'error', summary: problemMessage(error), life: 6000 });
    } finally {
      this.saving.set(false);
    }
  }
}
