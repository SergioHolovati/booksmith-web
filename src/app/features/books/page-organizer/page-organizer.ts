import { Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { firstValueFrom } from 'rxjs';

import { ManuscriptApi } from '../../../core/api/manuscript.api';
import { problemMessage } from '../../../core/api/problem';
import { UniverseApi } from '../../../core/api/universe.api';
import { fontFamilyCss, loadBookFonts } from '../../../core/fonts/book-fonts';
import { BookDetail, PagePreview } from '../../../core/models/api.models';
import { trimSize } from '../../../core/util/print-geometry';
import { artStyle, boxView, fitBlocks, previewTextStyle, withBackdrop } from '../../editor/page-designer/page-designer';
import { BookPreviewComponent } from './book-preview';

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

/**
 * Livro ilustrado: organizar as páginas vendo as miniaturas (a ilustração, o texto e a fonte, como no desenho da
 * página). No celular, toque na página e use as setas; no computador, dá também para arrastar. Cada mudança salva a
 * ordem na hora.
 */
@Component({
  selector: 'app-page-organizer',
  imports: [RouterLink, ButtonModule, ProgressSpinnerModule, BookPreviewComponent],
  template: `
    <div class="organizer narrow">
      <a class="back-link" [routerLink]="['/books', bookId()]"><i class="pi pi-arrow-left" aria-hidden="true"></i>
        Voltar ao livro</a>
      <div class="title-row">
        <h1>Organizar páginas</h1>
        @if (book(); as b) {
          <p-button label="Visualizar prévia" icon="pi pi-eye" size="small" severity="secondary" [outlined]="true"
            [disabled]="!pages().length" (onClick)="preview.start()" data-organizer-preview />
          <app-book-preview #preview [bookId]="b.id" [layout]="b.layout" />
        }
      </div>
      <p class="muted small">Toque numa página e use as setas para mudar de lugar. No computador, dá para arrastar.
        A ordem é salva na hora.</p>

      @if (error(); as message) {
        <p class="error" role="alert">{{ message }}</p>
      }
      @if (loading()) {
        <div class="center"><p-progress-spinner strokeWidth="4" /></div>
      } @else {
        <ol class="grid" data-page-organizer>
          @for (p of pages(); track p.id; let i = $index) {
            <li [class.spread]="p.page.spread" [class.selected]="selected() === p.id" [class.over]="dragOver() === i">
              <button type="button" class="card" (click)="select(p.id)" [attr.aria-pressed]="selected() === p.id"
                [attr.aria-label]="'Página ' + (i + 1) + ': ' + p.title" [attr.data-organizer-page]="i + 1"
                draggable="true" (dragstart)="dragStart(i, $event)" (dragover)="dragOverAt(i, $event)"
                (dragleave)="dragOver.set(null)" (drop)="drop(i, $event)" (dragend)="dragOver.set(null)">
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
              </button>
            </li>
          }
        </ol>

        @if (selectedIndex(); as index) {
          <div class="toolbar glass-card" data-organizer-toolbar>
            <span class="small">Página {{ index }}</span>
            <p-button icon="pi pi-arrow-left" label="Antes" severity="secondary" [outlined]="true" size="small"
              [disabled]="index === 1 || saving()" (onClick)="moveSelected(-1)" data-organizer-before />
            <p-button icon="pi pi-arrow-right" iconPos="right" label="Depois" severity="secondary" [outlined]="true"
              size="small" [disabled]="index === pages().length || saving()" (onClick)="moveSelected(1)"
              data-organizer-after />
            <p-button icon="pi pi-pencil" label="Abrir" size="small" [routerLink]="['/write', selected()]" />
          </div>
        }
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
    .toolbar { position: fixed; left: 50%; transform: translateX(-50%);
      bottom: calc(env(safe-area-inset-bottom, 0px) + 4.8rem); z-index: 20; display: flex; flex-wrap: wrap;
      align-items: center; justify-content: center; gap: .5rem; padding: .6rem .8rem; width: max-content;
      max-width: calc(100vw - 32px); }
  `,
})
export class PageOrganizerComponent {
  private readonly api = inject(ManuscriptApi);
  private readonly universeApi = inject(UniverseApi);
  private readonly toast = inject(MessageService);

  readonly bookId = input.required<string>();

  readonly book = signal<BookDetail | null>(null);
  readonly pages = signal<PagePreview[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly selected = signal<string | null>(null);
  readonly dragOver = signal<number | null>(null);
  private readonly images = signal<Record<string, string>>({});
  private readonly imageRatios = signal<Record<string, number>>({});
  private dragFrom: number | null = null;

  /** A posição da página escolhida, a partir de 1 (0 = nenhuma). */
  readonly selectedIndex = computed(() => this.pages().findIndex((p) => p.id === this.selected()) + 1);
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
      const [book, pages] = await Promise.all([
        firstValueFrom(this.api.getBook(this.bookId())),
        firstValueFrom(this.api.pagePreviews(this.bookId())),
      ]);
      this.book.set(book);
      this.pages.set(pages);
      loadBookFonts([book.layout?.font, ...pages.flatMap((p) => [p.page.font, ...(p.page.boxes ?? []).map((b) => b.font)])]);
      const images = await firstValueFrom(this.universeApi.listImages(book.universeId));
      this.images.set(Object.fromEntries(images.map((image) => [image.id, image.url])));
    } catch (error) {
      this.error.set(problemMessage(error, 'Não foi possível abrir as páginas.'));
    } finally {
      this.loading.set(false);
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
      this.selected.set(this.pages()[from]?.id ?? null);
      await this.move(from, index);
    }
  }

  /** Muda na tela na hora e salva; se a API recusar, volta como estava. */
  private async move(from: number, to: number): Promise<void> {
    const before = this.pages();
    const after = moveItem(before, from, to);
    if (after.every((p, i) => p.id === before[i].id)) {
      return;
    }
    this.pages.set(after);
    this.saving.set(true);
    try {
      await firstValueFrom(this.api.reorderChapters(this.bookId(), after.map((p) => p.id)));
    } catch (error) {
      this.pages.set(before);
      this.toast.add({ severity: 'error', summary: problemMessage(error, 'Não foi possível mudar a ordem.'), life: 5000 });
    } finally {
      this.saving.set(false);
    }
  }
}
