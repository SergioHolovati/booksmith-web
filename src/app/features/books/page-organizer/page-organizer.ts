import { Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { firstValueFrom } from 'rxjs';

import { ExportApi } from '../../../core/api/export.api';
import { ManuscriptApi } from '../../../core/api/manuscript.api';
import { problemMessage } from '../../../core/api/problem';
import { UniverseApi } from '../../../core/api/universe.api';
import { AuthService } from '../../../core/auth/auth.service';
import { fontFamilyCss, loadBookFonts } from '../../../core/fonts/book-fonts';
import { BookDetail, ExtraPage, PagePreview, PrintPageCheck, UniverseImage } from '../../../core/models/api.models';
import { trimSize } from '../../../core/util/print-geometry';
import { artStyle, boxView, fitBlocks, previewTextStyle, withBackdrop } from '../../editor/page-designer/page-designer';
import { IllustrationPickerComponent } from '../../editor/illustration/illustration-picker';
import { BookPreviewComponent } from './book-preview';
import { DEFAULT_PAGE } from '../../editor/page-designer/page-designer';
import {
  EXTRA_TITLES, OrganizerItem, REMOVABLE, buildItems, extraBackground, extraLines, extraPending, insertIndex, placedExtras,
  withoutPage,
} from './organizer-items';

/** A lista com o item de {@code from} levado para {@code to} (os outros andam uma casa). */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  const result = [...list];
  if (from < 0 || from >= list.length || to < 0 || to >= list.length || from === to) {
    return result;
  }
  const [item] = result.splice(from, 1);
  result.splice(to, 0, item);
  return result;
}

/** A ordem das páginas da história. */
function storyOrder(list: readonly OrganizerItem[]): string[] {
  return list.filter((i) => i.kind === 'story').map((i) => i.id);
}

/**
 * Livro ilustrado: organizar as páginas vendo as miniaturas (a ilustração, o texto e a fonte, como no desenho da
 * página), junto com as que o Booksmith gera (folha de rosto, créditos, dedicatória…), que mudam de lugar e de fundo. No celular, toque na página e use as setas; no computador, dá também para arrastar. Cada mudança salva a
 * ordem na hora.
 */
@Component({
  selector: 'app-page-organizer',
  imports: [RouterLink, ButtonModule, ProgressSpinnerModule, BookPreviewComponent, IllustrationPickerComponent],
  template: `
    <div class="organizer narrow">
      <a class="back-link" [routerLink]="['/books', bookId()]"><i class="pi pi-arrow-left" aria-hidden="true"></i>
        Voltar ao livro</a>
      <div class="title-row">
        <h1>Organizar páginas</h1>
        @if (book(); as b) {
          <p-button label="Visualizar prévia" icon="pi pi-eye" size="small" severity="secondary" [outlined]="true"
            [disabled]="!pages().length" (onClick)="preview.start()" data-organizer-preview />
          <app-book-preview #preview [bookId]="b.id" [layout]="b.layout" [checks]="checks()" [checkCount]="checkCount()" />
        }
      </div>
      <p class="muted small">Toque numa página e use as setas para mudar de lugar. No computador, dá para arrastar.
        A ordem é salva na hora.</p>
      @if (generates()) {
        <p class="muted small extras-hint" data-organizer-extras-hint>
          <i class="pi pi-bookmark" aria-hidden="true"></i>
          As páginas com a marca <strong>Gerada</strong> (folha de rosto, créditos, dedicatória…) o Booksmith monta
          com o que você escreveu em
          <a [routerLink]="['/books', bookId(), 'paginas']" data-organizer-book-pages>Páginas do livro</a>. Toque
          numa delas para mudar o fundo. As com <strong>Completar</strong> ainda têm só o modelo e não saem no
          livro até você escrever o texto (ou tirar a página).
        </p>
      }

      @if (error(); as message) {
        <p class="error" role="alert">{{ message }}</p>
      }
      @if (loading()) {
        <div class="center"><p-progress-spinner strokeWidth="4" /></div>
      } @else {
        <ol class="grid" data-page-organizer>
          @for (item of items(); track item.id; let i = $index) {
            <li [class.spread]="item.kind === 'story' && item.page.page.spread" [class.selected]="selected() === item.id"
              [class.over]="dragOver() === i" [class.extra]="item.kind === 'extra'">
              <button type="button" class="card" (click)="select(item.id)" [attr.aria-pressed]="selected() === item.id"
                [attr.aria-label]="'Página ' + (i + 1) + ': ' + title(item)" [attr.data-organizer-page]="i + 1"
                [attr.data-organizer-extra]="item.kind === 'extra' ? item.extra.key : null"
                draggable="true" (dragstart)="dragStart(i, $event)" (dragover)="dragOverAt(i, $event)"
                (dragleave)="dragOver.set(null)" (drop)="drop(i, $event)" (dragend)="dragOver.set(null)">
                @if (item.kind === 'story') {
                  @let p = item.page;
                  <span class="thumb" [style.aspect-ratio]="ratio(p)" [style.background-color]="p.page.background">
                    @if (imageUrl(p); as url) {
                      <img class="art" [src]="url" alt="" [style]="art(p)" (load)="imageLoaded(p, $event)" />
                    }
                    @for (box of textBoxes(p); track box.index) {
                      <span [class]="box.classes" [style]="box.style" [style.font-family]="box.font">
                        @for (line of box.lines; track $index) {
                          <span class="line">{{ line }}</span>
                        }
                      </span>
                    }
                  </span>
                  <span class="caption"><strong>{{ i + 1 }}</strong> {{ p.title }}@if (p.page.spread) { · dupla }</span>
                } @else {
                  @let x = item.extra;
                  <span class="thumb" [style.aspect-ratio]="singleRatio()" [style.background-color]="extraColor(x)"
                    [attr.data-extra-background]="extraColor(x)">
                    @if (extraImage(x); as url) {
                      <img class="cover-art" [src]="url" alt="" />
                    }
                    @if (pending(item)) {
                      <span class="tag pending" data-extra-pending>Completar</span>
                    } @else {
                      <span class="tag">Gerada</span>
                    }
                    @if (!(x.key === 'cover' && book()?.coverUrl)) {
                      <span class="extra-text" [class]="'extra-text k-' + x.key" [style.font-family]="bookFont()">
                        @for (line of lines(item); track $index) {
                          <span class="line">{{ line }}</span>
                        }
                      </span>
                    }
                  </span>
                  <span class="caption"><strong>{{ i + 1 }}</strong> {{ title(item) }}</span>
                }
              </button>
            </li>
          }
        </ol>

        <div class="add-row" data-organizer-add>
          <span class="small muted">{{ selected() ? 'Nova página depois da escolhida:' : 'Nova página:' }}</span>
          <p-button icon="pi pi-plus" label="Com texto" severity="secondary" [outlined]="true" size="small"
            [disabled]="saving()" (onClick)="addTextPage()" data-organizer-add-text />
          <p-button icon="pi pi-image" label="Só ilustração" severity="secondary" [outlined]="true" size="small"
            [disabled]="saving() || !book()?.universeId" (onClick)="pickFor.set('new'); pickingImage.set(true)"
            data-organizer-add-art />
        </div>

        @if (selectedIndex(); as index) {
          <div class="toolbar glass-card" data-organizer-toolbar>
            <span class="small">Página {{ index }}</span>
            <p-button icon="pi pi-arrow-left" label="Antes" severity="secondary" [outlined]="true" size="small"
              [disabled]="index === 1 || saving()" (onClick)="moveSelected(-1)" data-organizer-before />
            <p-button icon="pi pi-arrow-right" iconPos="right" label="Depois" severity="secondary" [outlined]="true"
              size="small" [disabled]="index === items().length || saving()" (onClick)="moveSelected(1)"
              data-organizer-after />
            @if (selectedExtra(); as x) {
              <label class="color-pick" title="Cor de fundo desta página">
                <input type="color" [value]="extraColor(x)" (change)="setExtraColor($any($event.target).value)"
                  aria-label="Cor de fundo desta página" data-extra-color />
              </label>
              <p-button icon="pi pi-image" label="Ilustração" severity="secondary" [outlined]="true" size="small"
                [disabled]="saving() || !book()?.universeId" (onClick)="pickFor.set('extra'); pickingImage.set(true)"
                data-extra-image />
              @if (x.imageId || x.color) {
                <p-button icon="pi pi-undo" label="Fundo padrão" severity="secondary" [text]="true" size="small"
                  [disabled]="saving()" (onClick)="resetExtraBackground()" data-extra-reset />
              }
              @if (removable(x)) {
                <p-button icon="pi pi-times" label="Tirar do livro" severity="danger" [text]="true" size="small"
                  [disabled]="saving()" (onClick)="removeExtra()" data-extra-remove />
              }
              <p-button icon="pi pi-pencil" label="Texto" size="small" [routerLink]="['/books', bookId(), 'paginas']" />
            } @else {
              <p-button icon="pi pi-pencil" label="Abrir" size="small" [routerLink]="['/write', selected()]" />
            }
          </div>
        }
        <app-illustration-picker [universeId]="book()?.universeId ?? null" [(visible)]="pickingImage"
          (picked)="picked($event)" />
      }
    </div>
  `,
  styles: `
    .narrow { max-width: 960px; margin: 0 auto; padding: 1rem 1rem 7rem; }
    .back-link { display: inline-flex; align-items: center; gap: .4rem; min-height: var(--bs-touch); color: var(--bs-ember); font-size: .9rem; }
    h1 { margin: .4rem 0; font-size: 1.4rem; }
    .title-row { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: .5rem; }
    .center { display: flex; justify-content: center; padding: 3rem 0; }
    .error { color: var(--bs-danger, #e5484d); }
    .grid { list-style: none; margin: 1rem 0 0; padding: 0; display: grid; gap: .8rem;
      grid-template-columns: repeat(2, minmax(0, 1fr)); }
    @media (min-width: 640px) { .grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
    li.spread { grid-column: span 2; }
    .card { width: 100%; padding: .35rem; border: 2px solid transparent; border-radius: 10px; background: none;
      color: var(--bs-text); font: inherit; cursor: pointer; display: flex; flex-direction: column; gap: .3rem; }
    li.selected .card { border-color: var(--bs-ember); background: rgba(242, 140, 56, .12); }
    li.over .card { border-color: var(--bs-ember); border-style: dashed; }
    .thumb { position: relative; display: block; overflow: hidden; width: 100%; container-type: inline-size;
      border-radius: 3px; box-shadow: 0 2px 8px rgba(0, 0, 0, .35); }
    .art { position: absolute; max-width: none; pointer-events: none; }
    .text { position: absolute; box-sizing: border-box; font-weight: 700; line-height: 1.3; pointer-events: none; }
    .line { display: block; margin: 0 0 .35em; }
    .text.dark { color: #1a1a1a; }
    .text.light { color: #fff; }
    .text.band.dark { background: rgba(255, 255, 255, .82); padding: .5em .7em; border-radius: .5em; }
    .text.band.light { background: rgba(0, 0, 0, .6); padding: .5em .7em; border-radius: .5em; }
    .text.haze { padding: 1em 1.3em; background-size: 100% 100%; background-repeat: no-repeat; }
    .text.blur { z-index: 1; }
    .text.blur::before { content: ''; position: absolute; inset: calc(-.9em * var(--bh, 1)) -1.2em; z-index: -1;
      pointer-events: none;
      backdrop-filter: blur(var(--blur, 4px)); -webkit-backdrop-filter: blur(var(--blur, 4px));
      background: rgba(255, 255, 255, .25);
      mask-image: linear-gradient(to right, transparent, #000 1.2em, #000 calc(100% - 1.2em), transparent),
        linear-gradient(to bottom, transparent, #000 calc(.9em * var(--bh, 1)),
          #000 calc(100% - .9em * var(--bh, 1)), transparent);
      mask-composite: intersect; -webkit-mask-composite: source-in; }
    .text.blur.light::before { background: rgba(0, 0, 0, .25); }
    .caption { font-size: .8rem; color: var(--bs-text-soft); text-align: left; overflow: hidden; text-overflow: ellipsis;
      white-space: nowrap; }
    .caption strong { color: var(--bs-text); margin-right: .25rem; }
    .tag { position: absolute; top: 4px; left: 4px; z-index: 2; padding: .05rem .45rem; border-radius: 999px;
      font-size: .68rem; font-weight: 600; color: #fff; background: rgba(242, 140, 56, .92); pointer-events: none; }
    .tag.pending { background: rgba(176, 106, 20, .95); }
    .extras-hint .pi { margin-right: .3rem; font-size: .8rem; }
    .extras-hint a { color: var(--bs-ember); }
    .cover-art { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; pointer-events: none; }
    .extra-text { position: absolute; left: 12%; right: 12%; top: 30%; color: #1a1a1a; text-align: center;
      font-size: 5cqw; line-height: 1.3; pointer-events: none; overflow: hidden; max-height: 60%; }
    .extra-text .line:first-child { font-weight: 700; }
    .extra-text.k-cover .line:first-child, .extra-text.k-title .line:first-child { font-size: 9cqw; }
    .extra-text.k-credits { top: 8%; font-size: 4cqw; }
    .extra-text.k-colophon { top: 62%; font-size: 4cqw; }
    .color-pick input { width: 2.4rem; height: 2.2rem; padding: 0; border: 1px solid var(--bs-border, #444);
      border-radius: 6px; background: none; cursor: pointer; }
    .add-row { display: flex; flex-wrap: wrap; align-items: center; gap: .5rem; margin-top: 1rem; }
    .toolbar { position: fixed; left: 50%; transform: translateX(-50%);
      bottom: calc(env(safe-area-inset-bottom, 0px) + 4.8rem); z-index: 20; display: flex; flex-wrap: wrap;
      align-items: center; justify-content: center; gap: .5rem; padding: .6rem .8rem; width: max-content;
      max-width: calc(100vw - 32px); }
  `,
})
export class PageOrganizerComponent {
  private readonly api = inject(ManuscriptApi);
  private readonly exportApi = inject(ExportApi);
  private readonly universeApi = inject(UniverseApi);
  private readonly toast = inject(MessageService);
  private readonly auth = inject(AuthService);

  readonly bookId = input.required<string>();

  readonly book = signal<BookDetail | null>(null);
  /** A conferência para a gráfica (na prévia). */
  readonly checks = signal<PrintPageCheck[]>([]);
  readonly checkCount = signal(0);
  /** As páginas da história e as geradas, na ordem do livro. */
  readonly items = signal<OrganizerItem[]>([]);
  readonly pages = computed(() =>
    this.items().flatMap((item) => (item.kind === 'story' ? [item.page] : [])));
  readonly pickingImage = signal(false);
  /** Para que é a ilustração escolhida: o fundo da gerada ou uma página nova só de ilustração. */
  readonly pickFor = signal<'extra' | 'new'>('extra');
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly selected = signal<string | null>(null);
  readonly dragOver = signal<number | null>(null);
  private readonly images = signal<Record<string, string>>({});
  private readonly imageRatios = signal<Record<string, number>>({});
  private dragFrom: number | null = null;

  /** A posição da página escolhida, a partir de 1 (0 = nenhuma). */
  readonly selectedIndex = computed(() => this.items().findIndex((item) => item.id === this.selected()) + 1);
  /** A página gerada escolhida (para mudar o fundo). */
  readonly selectedExtra = computed(() => {
    const item = this.items().find((i) => i.id === this.selected());
    return item?.kind === 'extra' ? item.extra : null;
  });
  /** O livro tem páginas geradas (a diagramação não desligou). */
  readonly generates = computed(() => this.book()?.layout?.autoPages !== false);
  readonly bookFont = computed(() => fontFamilyCss(this.book()?.layout?.font));
  private readonly trim = computed<[number, number]>(() => {
    const layout = this.book()?.layout;
    return layout ? trimSize(layout) : [200, 200];
  });

  constructor() {
    queueMicrotask(() => void this.load());
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const [book, pages, extras] = await Promise.all([
        firstValueFrom(this.api.getBook(this.bookId())),
        firstValueFrom(this.api.pagePreviews(this.bookId())),
        firstValueFrom(this.api.extraPages(this.bookId())).catch(() => [] as ExtraPage[]),
      ]);
      this.book.set(book);
      firstValueFrom(this.exportApi.printCheck(book.id, book.layout)).then(
        (check) => {
          this.checks.set(check.pages ?? []);
          this.checkCount.set(check.pageCount ?? 0);
        },
        () => this.checks.set([]),
      );
      this.items.set(buildItems(pages, book.layout?.autoPages === false ? [] : extras));
      loadBookFonts([book.layout?.font, ...pages.flatMap((p) => [p.page.font, ...(p.page.boxes ?? []).map((b) => b.font)])]);
      const images = await firstValueFrom(this.universeApi.listImages(book.universeId));
      this.images.set(Object.fromEntries(images.map((image) => [image.id, image.url])));
    } catch (error) {
      this.error.set(problemMessage(error, 'Não foi possível abrir as páginas.'));
    } finally {
      this.loading.set(false);
    }
  }

  singleRatio(): string {
    const [w, h] = this.trim();
    return `${w} / ${h}`;
  }

  title(item: OrganizerItem): string {
    if (item.kind === 'story') {
      return item.page.title;
    }
    return item.extra.key === 'about' ? (this.book()?.pages?.aboutAuthorTitle || EXTRA_TITLES.about) : EXTRA_TITLES[item.extra.key];
  }

  lines(item: OrganizerItem): string[] {
    const book = this.book();
    if (item.kind !== 'extra' || !book) {
      return [];
    }
    return extraLines(item.extra.key, book.pages, book.title, this.auth.user()?.displayName ?? '');
  }

  /** Só com o modelo: não sai no livro até completar em Páginas do livro. */
  pending(item: OrganizerItem): boolean {
    return item.kind === 'extra' && extraPending(item.extra.key, this.book()?.pages);
  }

  extraColor(extra: ExtraPage): string {
    return extraBackground(extra, this.book()?.layout).color;
  }

  extraImage(extra: ExtraPage): string | null {
    if (extra.key === 'cover' && this.book()?.coverUrl) {
      return this.book()?.coverUrl ?? null;
    }
    const id = extraBackground(extra, this.book()?.layout).imageId;
    return id ? (this.images()[id] ?? null) : null;
  }

  setExtraColor(color: string): void {
    void this.changeExtra({ color, imageId: null });
  }

  picked(image: UniverseImage): void {
    if (this.pickFor() === 'new') {
      void this.addPage(image);
    } else {
      this.pickExtraImage(image);
    }
  }

  addTextPage(): void {
    void this.addPage(null);
  }

  /**
   * Cria a página da história logo depois da escolhida (sem escolha, depois da última da história). Com ilustração, é
   * página só de ilustração: a imagem de fundo e sem texto.
   */
  private async addPage(image: UniverseImage | null): Promise<void> {
    const before = this.items();
    const at = insertIndex(before, this.selected());
    this.saving.set(true);
    try {
      const title = image ? (image.caption?.trim() || 'Ilustração').slice(0, 200) : undefined;
      const chapter = await firstValueFrom(this.api.createChapter(this.bookId(), title));
      let page = { ...DEFAULT_PAGE };
      if (image) {
        page = { ...DEFAULT_PAGE, imageId: image.id, text: 'none' };
        this.images.update((images) => ({ ...images, [image.id]: image.url }));
        await firstValueFrom(this.api.setChapterPage(chapter.id, page));
      }
      const preview = { id: chapter.id, title: chapter.title, page, paragraphs: [] };
      const item: OrganizerItem = { kind: 'story', id: chapter.id, page: preview };
      const after = [...before.slice(0, at), item, ...before.slice(at)];
      this.items.set(after);
      // No servidor a página nova está no fim da história
      await this.saveOrder(before, after, [...storyOrder(before), chapter.id]);
      this.selected.set(chapter.id);
    } catch (error) {
      this.toast.add({ severity: 'error', summary: problemMessage(error, 'Não foi possível criar a página.'), life: 5000 });
      await this.load();
    } finally {
      this.saving.set(false);
    }
  }

  removable(extra: ExtraPage): boolean {
    return REMOVABLE.includes(extra.key);
  }

  /** Tira a gerada escolhida do livro (apaga o texto); volta com "Usar o modelo" em Páginas do livro. */
  async removeExtra(): Promise<void> {
    const extra = this.selectedExtra();
    const book = this.book();
    if (!extra || !book?.pages) {
      return;
    }
    this.saving.set(true);
    try {
      const pages = await firstValueFrom(this.api.updatePages(book.id, withoutPage(book.pages, extra.key)));
      this.book.set({ ...book, pages });
      this.items.update((items) => items.filter((i) => i.id !== 'extra:' + extra.key));
      this.selected.set(null);
      this.toast.add({ severity: 'success', summary: EXTRA_TITLES[extra.key] + ' saiu do livro.',
        detail: 'Para voltar, use o modelo em Páginas do livro.', life: 5000 });
    } catch (error) {
      this.toast.add({ severity: 'error', summary: problemMessage(error, 'Não foi possível tirar a página.'), life: 5000 });
    } finally {
      this.saving.set(false);
    }
  }

  pickExtraImage(image: UniverseImage): void {
    this.images.update((images) => ({ ...images, [image.id]: image.url }));
    void this.changeExtra({ imageId: image.id, color: null });
  }

  resetExtraBackground(): void {
    void this.changeExtra({ imageId: null, color: null });
  }

  /** Troca o fundo da página gerada escolhida e salva (volta como estava se a API recusar). */
  private async changeExtra(change: Partial<ExtraPage>): Promise<void> {
    const id = this.selected();
    const before = this.items();
    const after = before.map((item) => (item.kind === 'extra' && item.id === id
      ? { ...item, extra: { ...item.extra, ...change } } : item));
    this.items.set(after);
    this.saving.set(true);
    try {
      await firstValueFrom(this.api.updateExtraPages(this.bookId(), placedExtras(after)));
    } catch (error) {
      this.items.set(before);
      this.toast.add({ severity: 'error', summary: problemMessage(error, 'Não foi possível mudar o fundo.'), life: 5000 });
    } finally {
      this.saving.set(false);
    }
  }

  ratio(p: PagePreview): string {
    const [w, h] = this.trim();
    return `${p.page.spread ? 2 * w : w} / ${h}`;
  }

  imageUrl(p: PagePreview): string | null {
    return p.page.imageId ? (this.images()[p.page.imageId] ?? null) : null;
  }

  imageLoaded(p: PagePreview, event: Event): void {
    const img = event.target as HTMLImageElement;
    if (p.page.imageId && img.naturalWidth && img.naturalHeight) {
      this.imageRatios.update((r) => ({ ...r, [p.page.imageId as string]: img.naturalWidth / img.naturalHeight }));
    }
  }

  art(p: PagePreview): Record<string, string> {
    const [w, h] = this.trim();
    return artStyle(p.page, (p.page.spread ? 2 * w : w) / h, this.imageRatios()[p.page.imageId ?? ''] ?? 1);
  }

  /** Os blocos de texto da miniatura, cada um com o desenho dele (como no desenho da página). */
  textBoxes(p: PagePreview): { index: number; lines: string[]; style: Record<string, string>; font: string; classes: string }[] {
    const [trimW] = this.trim();
    return fitBlocks(p.page, p.blocks ?? [p.paragraphs])
      .map((lines, index) => {
        const view = boxView(p.page, index);
        return {
          index, lines, view,
          style: withBackdrop(view, previewTextStyle(view, this.trim()), trimW),
          font: fontFamilyCss(view.font ?? this.book()?.layout?.font),
          classes: 'text ' + view.color + (view.band ? ' band' : '') + (view.haze ? ' haze' : '') + (view.blur ? ' blur' : ''),
        };
      })
      .filter((box) => box.lines.length > 0 && box.view.text !== 'none');
  }

  select(id: string): void {
    this.selected.set(this.selected() === id ? null : id);
  }

  async moveSelected(direction: -1 | 1): Promise<void> {
    const from = this.selectedIndex() - 1;
    await this.move(from, from + direction);
  }

  dragStart(index: number, event: DragEvent): void {
    this.dragFrom = index;
    event.dataTransfer?.setData('text/plain', String(index));
  }

  dragOverAt(index: number, event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(index);
  }

  async drop(index: number, event: DragEvent): Promise<void> {
    event.preventDefault();
    this.dragOver.set(null);
    const from = this.dragFrom;
    this.dragFrom = null;
    if (from !== null) {
      this.selected.set(this.items()[from]?.id ?? null);
      await this.move(from, index);
    }
  }

  /** Muda na tela na hora e salva; se a API recusar, volta como estava. */
  private async move(from: number, to: number): Promise<void> {
    const before = this.items();
    const after = moveItem(before, from, to);
    if (after.every((item, i) => item.id === before[i].id)) {
      return;
    }
    this.items.set(after);
    this.saving.set(true);
    try {
      await this.saveOrder(before, after);
    } catch (error) {
      this.items.set(before);
      this.toast.add({ severity: 'error', summary: problemMessage(error, 'Não foi possível mudar a ordem.'), life: 5000 });
    } finally {
      this.saving.set(false);
    }
  }

  /** Salva o que mudou: primeiro a ordem das páginas da história, depois o lugar das geradas. */
  private async saveOrder(before: readonly OrganizerItem[], after: readonly OrganizerItem[],
    saved: readonly string[] = storyOrder(before)): Promise<void> {
    const places = (list: readonly OrganizerItem[]) => JSON.stringify(placedExtras(list));
    if (storyOrder(after).join() !== saved.join()) {
      await firstValueFrom(this.api.reorderChapters(this.bookId(), storyOrder(after)));
    }
    if (places(after) !== places(before)) {
      await firstValueFrom(this.api.updateExtraPages(this.bookId(), placedExtras(after)));
    }
  }
}
