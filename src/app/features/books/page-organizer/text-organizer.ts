import { Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { firstValueFrom } from 'rxjs';

import { ExportApi } from '../../../core/api/export.api';
import { ManuscriptApi } from '../../../core/api/manuscript.api';
import { problemMessage } from '../../../core/api/problem';
import { ArtPage, BookDetail, ExtraPage, PageMapBlock, UniverseImage } from '../../../core/models/api.models';
import { trimSize } from '../../../core/util/print-geometry';
import { uuidV4 } from '../../../core/util/uuid';
import { IllustrationPickerComponent } from '../../editor/illustration/illustration-picker';
import { BookPreviewComponent } from './book-preview';
import { PageThumbsComponent } from './page-thumbs';
import { artSlots, canMoveArt, moveArt, moveChapter, newArtPlace, pageRange } from './text-organizer-items';

const KIND_LABEL: Record<PageMapBlock['kind'], string> = {
  cover: 'Capa', title: 'Folha de rosto', front: 'Abertura', toc: 'Sumário', chapter: 'Capítulo',
  illustration: 'Ilustração', back: 'Fim do livro',
};

/**
 * Livro de texto: todas as páginas do livro como saem no PDF, trecho a trecho (capa, folha de rosto, créditos,
 * sumário, cada capítulo com as páginas dele, as do fim). As páginas de um capítulo andam juntas com ele; entre os
 * capítulos, no começo e no fim, o autor põe páginas só com uma ilustração.
 */
@Component({
  selector: 'app-text-organizer',
  imports: [RouterLink, ButtonModule, ProgressSpinnerModule, BookPreviewComponent, IllustrationPickerComponent,
    PageThumbsComponent],
  template: `
    <div class="organizer narrow">
      <a class="back-link" [routerLink]="['/books', bookId()]"><i class="pi pi-arrow-left" aria-hidden="true"></i>
        Voltar ao livro</a>
      <div class="title-row">
        <h1>Organizar páginas</h1>
        @if (book(); as b) {
          <p-button label="Visualizar prévia" icon="pi pi-eye" size="small" severity="secondary" [outlined]="true"
            [disabled]="!blocks().length" (onClick)="preview.start()" data-organizer-preview />
          <app-book-preview #preview [bookId]="b.id" [layout]="b.layout" />
        }
      </div>
      <p class="muted small">Todas as páginas do livro, como saem no PDF. As páginas de um capítulo andam juntas
        com ele. Toque num trecho para mudar de lugar ou pôr uma <strong>página de ilustração</strong> logo depois
        (no começo do livro, entre os capítulos ou no fim).</p>

      @if (error(); as message) {
        <p class="error" role="alert">{{ message }}</p>
      }
      @if (loading()) {
        <div class="center"><p-progress-spinner strokeWidth="4" /></div>
      } @else if (book(); as b) {
        @if (updating()) {
          <p class="muted small updating" role="status" data-text-updating>
            <i class="pi pi-spin pi-spinner" aria-hidden="true"></i> Atualizando as páginas…</p>
        }
        <p class="muted small">{{ total() }} páginas</p>
        <ol class="blocks" data-text-organizer>
          @for (block of blocks(); track key(block) + ':' + version(); let i = $index) {
            <li [class.selected]="selected() === key(block)" [class]="'k-' + block.kind">
              <button type="button" class="block" (click)="select(block)" [attr.aria-pressed]="selected() === key(block)"
                [attr.data-text-block]="i + 1" [attr.data-block-kind]="block.kind" [attr.data-block-ref]="block.ref">
                <span class="head">
                  <span class="kind">{{ label(block) }}</span>
                  <span class="title">{{ block.kind === 'chapter' || block.kind === 'front' || block.kind === 'back'
                    ? block.title : '' }}</span>
                  <span class="range">{{ range(block) }}</span>
                </span>
                @defer (on viewport) {
                  <app-page-thumbs [bookId]="b.id" [layout]="b.layout" [first]="block.firstPage"
                    [count]="block.pageCount" [ratio]="ratio()" />
                } @placeholder {
                  <span class="placeholder" [style.min-height.px]="80"></span>
                }
              </button>
            </li>
          }
        </ol>

        <div class="add-row">
          <span class="small muted">{{ selected() ? 'Depois do trecho escolhido:' : 'Depois do último capítulo:' }}</span>
          <p-button icon="pi pi-image" label="Página de ilustração" severity="secondary" [outlined]="true" size="small"
            [disabled]="busy() || !b.universeId" (onClick)="pickNew()" data-text-add-art />
        </div>

        @if (selectedBlock(); as s) {
          <div class="toolbar glass-card" data-text-toolbar>
            <span class="small">{{ label(s) }}</span>
            @if (s.kind === 'chapter' || s.kind === 'illustration') {
              <p-button icon="pi pi-arrow-up" label="Antes" severity="secondary" [outlined]="true" size="small"
                [disabled]="busy() || !canMove(s, -1)" (onClick)="move(s, -1)" data-text-before />
              <p-button icon="pi pi-arrow-down" label="Depois" severity="secondary" [outlined]="true" size="small"
                [disabled]="busy() || !canMove(s, 1)" (onClick)="move(s, 1)" data-text-after />
            }
            @if (s.kind === 'illustration') {
              @let art = artOf(s);
              <p-button [icon]="art?.bleed ? 'pi pi-stop' : 'pi pi-expand'"
                [label]="art?.bleed ? 'Dentro das margens' : 'Até a borda'" severity="secondary" [outlined]="true"
                size="small" [disabled]="busy()" (onClick)="toggleBleed(s)" data-art-bleed />
              <p-button icon="pi pi-images" label="Trocar" severity="secondary" [outlined]="true" size="small"
                [disabled]="busy()" (onClick)="pickChange()" data-art-change />
              <p-button icon="pi pi-times" label="Tirar" severity="danger" [text]="true" size="small"
                [disabled]="busy()" (onClick)="removeArt(s)" data-art-remove />
            } @else if (s.kind === 'chapter') {
              <p-button icon="pi pi-pencil" label="Abrir" size="small" [routerLink]="['/write', s.ref]" data-text-open />
            } @else if (s.kind === 'cover') {
              <p-button icon="pi pi-pencil" label="Capa" size="small" [routerLink]="['/books', bookId(), 'capa']" />
            } @else if (s.kind !== 'toc') {
              <p-button icon="pi pi-pencil" label="Texto" size="small" [routerLink]="['/books', bookId(), 'paginas']"
                data-text-edit />
            }
          </div>
        }
        <app-illustration-picker [universeId]="b.universeId" [(visible)]="picking"
          (picked)="picked($event)" />
      }
    </div>
  `,
  styles: `
    .narrow { max-width: 960px; margin: 0 auto; padding: 1rem 1rem 8rem; }
    .back-link { display: inline-flex; align-items: center; gap: .4rem; min-height: var(--bs-touch); color: var(--bs-ember); font-size: .9rem; }
    h1 { margin: .4rem 0; font-size: 1.4rem; }
    .title-row { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: .5rem; }
    .center { display: flex; justify-content: center; padding: 3rem 0; }
    .error { color: var(--bs-danger, #e5484d); }
    .updating .pi { margin-right: .3rem; }
    .blocks { list-style: none; margin: .6rem 0 0; padding: 0; display: flex; flex-direction: column; gap: .7rem; }
    .block { width: 100%; display: flex; flex-direction: column; gap: .5rem; padding: .6rem; text-align: left;
      border: 2px solid var(--bs-border, rgba(255, 255, 255, .12)); border-radius: 10px; background: none;
      color: var(--bs-text); font: inherit; cursor: pointer; }
    li.k-chapter .block { background: rgba(255, 255, 255, .03); }
    li.k-illustration .block { border-style: dashed; border-color: rgba(242, 140, 56, .55); }
    li.selected .block { border-color: var(--bs-ember); border-style: solid; background: rgba(242, 140, 56, .12); }
    .head { display: flex; align-items: baseline; gap: .5rem; min-width: 0; }
    .kind { flex: none; font-size: .72rem; font-weight: 700; text-transform: uppercase; letter-spacing: .04em;
      color: var(--bs-ember); }
    .title { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; }
    .range { flex: none; font-size: .78rem; color: var(--bs-text-soft); }
    .placeholder { display: block; }
    .add-row { display: flex; flex-wrap: wrap; align-items: center; gap: .5rem; margin-top: 1rem; }
    .toolbar { position: fixed; left: 50%; transform: translateX(-50%);
      bottom: calc(env(safe-area-inset-bottom, 0px) + 4.8rem); z-index: 20; display: flex; flex-wrap: wrap;
      align-items: center; justify-content: center; gap: .5rem; padding: .6rem .8rem; width: max-content;
      max-width: calc(100vw - 32px); }
  `,
})
export class TextOrganizerComponent {
  private readonly api = inject(ManuscriptApi);
  private readonly exportApi = inject(ExportApi);
  private readonly toast = inject(MessageService);

  readonly bookId = input.required<string>();

  readonly book = signal<BookDetail | null>(null);
  readonly blocks = signal<PageMapBlock[]>([]);
  readonly total = signal(0);
  /** Muda a cada mapa novo: as miniaturas carregam de novo (a paginação pode ter mudado). */
  readonly version = signal(0);
  /** As páginas geradas (vão de volta como vieram) e as de ilustração, na ordem. */
  private generated: ExtraPage[] = [];
  readonly arts = signal<ArtPage[]>([]);
  readonly loading = signal(true);
  readonly updating = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly selected = signal<string | null>(null);
  readonly picking = signal(false);
  /** Para que é a ilustração escolhida: uma página nova ou trocar a da escolhida. */
  private pickFor: 'new' | 'change' = 'new';

  readonly busy = computed(() => this.saving() || this.updating());
  readonly selectedBlock = computed(() => this.blocks().find((b) => this.key(b) === this.selected()) ?? null);
  readonly chapterIds = computed(() => this.blocks().filter((b) => b.kind === 'chapter' && b.ref).map((b) => b.ref as string));
  readonly ratio = computed(() => {
    const layout = this.book()?.layout;
    const [w, h] = layout ? trimSize(layout) : [148, 210];
    return `${w} / ${h}`;
  });

  constructor() {
    queueMicrotask(() => void this.load());
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const [book, extras] = await Promise.all([
        firstValueFrom(this.api.getBook(this.bookId())),
        firstValueFrom(this.api.extraPages(this.bookId())),
      ]);
      this.book.set(book);
      this.generated = extras.filter((e): e is ExtraPage => e.key !== 'illustration');
      this.arts.set(extras.filter((e): e is ArtPage => e.key === 'illustration'));
      await this.loadMap();
    } catch (error) {
      this.error.set(problemMessage(error, 'Não foi possível abrir as páginas.'));
    } finally {
      this.loading.set(false);
    }
  }

  /** O mapa das páginas com a diagramação do livro (o PDF é gerado de novo quando algo mudou). */
  private async loadMap(): Promise<void> {
    const book = this.book();
    if (!book) {
      return;
    }
    const map = await firstValueFrom(this.exportApi.pageMap(book.id, book.layout));
    this.blocks.set(map.blocks);
    this.total.set(map.pageCount);
    this.version.update((v) => v + 1);
  }

  key(block: PageMapBlock): string {
    return block.kind + ':' + (block.ref ?? '');
  }

  label(block: PageMapBlock): string {
    if (block.kind === 'chapter') {
      const n = this.chapterIds().findIndex((id) => id === block.ref) + 1;
      return `Capítulo ${n}`;
    }
    return KIND_LABEL[block.kind];
  }

  range(block: PageMapBlock): string {
    return pageRange(block);
  }

  select(block: PageMapBlock): void {
    this.selected.set(this.selected() === this.key(block) ? null : this.key(block));
  }

  artOf(block: PageMapBlock): ArtPage | null {
    return this.arts().find((a) => a.id === block.ref) ?? null;
  }

  canMove(block: PageMapBlock, direction: -1 | 1): boolean {
    if (block.kind === 'illustration') {
      return !!block.ref && canMoveArt(this.arts(), block.ref, direction, artSlots(this.chapterIds()));
    }
    const ids = this.chapterIds();
    const index = ids.indexOf(block.ref ?? '');
    return index >= 0 && index + direction >= 0 && index + direction < ids.length;
  }

  async move(block: PageMapBlock, direction: -1 | 1): Promise<void> {
    if (!block.ref) {
      return;
    }
    if (block.kind === 'illustration') {
      await this.saveArts(moveArt(this.arts(), block.ref, direction, artSlots(this.chapterIds())));
      return;
    }
    await this.run(async () => {
      await firstValueFrom(this.api.reorderChapters(this.bookId(), moveChapter(this.chapterIds(), block.ref as string, direction)));
    }, 'Não foi possível mudar a ordem.');
  }

  pickNew(): void {
    this.pickFor = 'new';
    this.picking.set(true);
  }

  pickChange(): void {
    this.pickFor = 'change';
    this.picking.set(true);
  }

  async picked(image: UniverseImage): Promise<void> {
    const block = this.selectedBlock();
    if (this.pickFor === 'change' && block?.kind === 'illustration') {
      await this.saveArts(this.arts().map((a) => (a.id === block.ref ? { ...a, imageId: image.id } : a)));
      return;
    }
    const place = newArtPlace(block, this.arts(), this.chapterIds());
    const art: ArtPage = { key: 'illustration', id: uuidV4(), after: place.after, imageId: image.id,
      color: null, bleed: false };
    const next = [...this.arts()];
    next.splice(place.index, 0, art);
    if (await this.saveArts(next)) {
      this.selected.set('illustration:' + art.id);
    }
  }

  async toggleBleed(block: PageMapBlock): Promise<void> {
    await this.saveArts(this.arts().map((a) => (a.id === block.ref ? { ...a, bleed: !a.bleed } : a)));
  }

  async removeArt(block: PageMapBlock): Promise<void> {
    if (await this.saveArts(this.arts().filter((a) => a.id !== block.ref))) {
      this.selected.set(null);
    }
  }

  /** Salva as páginas de ilustração (as geradas vão junto, como vieram) e atualiza o mapa. */
  private async saveArts(next: ArtPage[]): Promise<boolean> {
    return this.run(async () => {
      const saved = await firstValueFrom(this.api.updateExtraPages(this.bookId(), [...this.generated, ...next]));
      this.arts.set(saved.filter((e): e is ArtPage => e.key === 'illustration'));
    }, 'Não foi possível salvar a página de ilustração.');
  }

  private async run(action: () => Promise<void>, failure: string): Promise<boolean> {
    this.saving.set(true);
    try {
      await action();
    } catch (error) {
      this.toast.add({ severity: 'error', summary: problemMessage(error, failure), life: 5000 });
      return false;
    } finally {
      this.saving.set(false);
    }
    this.updating.set(true);
    try {
      await this.loadMap();
    } catch (error) {
      this.error.set(problemMessage(error, 'Não foi possível atualizar as páginas.'));
    } finally {
      this.updating.set(false);
    }
    return true;
  }
}
