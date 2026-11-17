import { Component, ElementRef, computed, input, output, signal, viewChild } from '@angular/core';

import { BOOK_FONTS, bookFont, fontFamilyCss, loadBookFonts } from '../../../core/fonts/book-fonts';
import { PageDesign, TextBox } from '../../../core/models/api.models';
import { hazeBackground } from '../../../core/util/haze';

/** Corpo da letra de cada tamanho, em pontos (o mesmo do PageDesign no servidor). */
export const PAGE_FONT_PT: Record<PageDesign['size'], number> = { s: 16, m: 20, l: 26, xl: 34 };
/** Distância do texto até o corte, em mm (a área segura do PDF). */
export const SAFE_MM = 12;
const MM_PER_PT = 25.4 / 72;

export const DEFAULT_PAGE: PageDesign = {
  imageId: null, background: '#ffffff', text: 'bottom', align: 'center', size: 'l', color: 'dark', band: false,
  spread: false, textSide: 'right', x: 10, y: 10, w: 80, zoom: 1, imageX: 50, imageY: 50, font: null, haze: false,
  blur: false,
};

/**
 * Tamanho e posição da ilustração na prévia, em % do contêiner (a página, ou o livro aberto): cobrir (como no PDF),
 * vezes o zoom, com o centro em imageX/imageY. {@code imageRatio}: largura ÷ altura da imagem.
 */
export function artStyle(page: PageDesign, canvasRatio: number, imageRatio: number): Record<string, string> {
  const zoom = page.zoom ?? 1;
  let w: number;
  let h: number;
  if (imageRatio > canvasRatio) {
    h = 100 * zoom;
    w = h * (imageRatio / canvasRatio);
  } else {
    w = 100 * zoom;
    h = w * (canvasRatio / imageRatio);
  }
  const cx = page.imageX ?? 50;
  const cy = page.imageY ?? 50;
  return { width: `${w}%`, height: `${h}%`, left: `${cx - w / 2}%`, top: `${cy - h / 2}%` };
}

const TEXTS: { value: PageDesign['text']; label: string }[] = [
  { value: 'top', label: 'Em cima' },
  { value: 'middle', label: 'No meio' },
  { value: 'bottom', label: 'Embaixo' },
  { value: 'free', label: 'Livre (arraste)' },
  { value: 'none', label: 'Sem texto' },
];
const ALIGNS: { value: PageDesign['align']; label: string; icon: string }[] = [
  { value: 'left', label: 'À esquerda', icon: 'pi-align-left' },
  { value: 'center', label: 'No centro', icon: 'pi-align-center' },
  { value: 'right', label: 'À direita', icon: 'pi-align-right' },
];
const SIZES: { value: PageDesign['size']; label: string }[] = [
  { value: 's', label: 'P' },
  { value: 'm', label: 'M' },
  { value: 'l', label: 'G' },
  { value: 'xl', label: 'GG' },
];

/** A caixa do texto livre fica dentro da página: largura de 15% a 100%, a borda até onde ela ainda cabe. */
export function clampBox(x: number, y: number, w: number): { x: number; y: number; w: number } {
  const width = Math.min(100, Math.max(15, w));
  const round = (v: number) => Math.round(v * 10) / 10;
  return { x: round(Math.min(100 - width, Math.max(0, x))), y: round(Math.min(95, Math.max(0, y))), w: round(width) };
}

/**
 * A posição da caixa de texto na prévia, em % do contêiner (a página, ou o livro aberto na dupla), a mesma conta do
 * PDF. No texto livre, x, y e w já são em % do contêiner.
 */
export function previewTextStyle(page: PageDesign, trimMm: [number, number]): Record<string, string> {
  const style = textBoxStyle(page, trimMm);
  if (!page.spread) {
    return style;
  }
  const font = `${parseFloat(style['font-size']) / 2}cqw`; // o contêiner da dupla tem duas páginas de largura
  if (page.text === 'free') {
    return { ...style, 'font-size': font };
  }
  // Na dupla, o texto fica numa das metades
  const left = parseFloat(style['left']) / 2 + (page.textSide === 'right' ? 50 : 0);
  return { ...style, left: `${left}%`, width: `${parseFloat(style['width']) / 2}%`, 'font-size': font };
}

const BOX_KEYS = ['x', 'y', 'w', 'size', 'align', 'color', 'font', 'band', 'haze', 'blur', 'backdropHeight'] as const;

/** O desenho do bloco {@code index} (0 = o primeiro, a própria página; os outros ficam onde o autor arrastou). */
export function boxView(page: PageDesign, index: number): PageDesign {
  const box = index > 0 ? page.boxes?.[index - 1] : undefined;
  return box ? { ...page, ...box, text: 'free' } : page;
}

/** Muda o bloco {@code index}: no primeiro, a página; nos outros, só os campos do bloco. */
export function withBoxChange(page: PageDesign, index: number, change: Partial<PageDesign>): PageDesign {
  const box = index > 0 ? page.boxes?.[index - 1] : undefined;
  if (!box) {
    return { ...page, ...change };
  }
  const own = Object.fromEntries(Object.entries(change).filter(([key]) => (BOX_KEYS as readonly string[]).includes(key)));
  const boxes = [...(page.boxes ?? [])];
  boxes[index - 1] = { ...box, ...own } as TextBox;
  return { ...page, boxes };
}

/** Os blocos de texto para os blocos desenhados: trecho a mais (mais quebras do que blocos) vai junto no último. */
export function fitBlocks(page: PageDesign, blocks: string[][]): string[][] {
  const count = 1 + (page.boxes?.length ?? 0);
  return blocks.length <= count ? blocks : [...blocks.slice(0, count - 1), blocks.slice(count - 1).flat()];
}

/** Um bloco novo, no jeito do bloco de onde ele veio, mais para baixo da página. */
export function newTextBox(from: PageDesign): TextBox {
  return {
    x: 10, y: 60, w: 80, size: from.size, align: from.align, color: from.color, font: from.font ?? null,
    band: from.band, haze: from.haze ?? false, blur: from.blur ?? false, backdropHeight: from.backdropHeight ?? 1,
  };
}

/** Desfoque do PDF: 2,5 mm de desvio (BlurPatch no servidor). */
const BLUR_MM = 2.45;

/**
 * O destaque atrás do texto: com névoa, o fundo esfumado esticado na caixa (o mesmo desenho do PDF); com desfoque, o
 * tamanho do borrado proporcional à página (o ::before da caixa desfoca o que está atrás).
 */
export function withBackdrop(page: PageDesign, style: Record<string, string>, trimWidthMm: number): Record<string, string> {
  const height = page.backdropHeight ?? 1;
  if (page.blur) {
    return { ...style, '--blur': `${(BLUR_MM / (page.spread ? 2 * trimWidthMm : trimWidthMm)) * 100}cqw`, '--bh': `${height}` };
  }
  if (!page.haze) {
    return style;
  }
  const haze: Record<string, string> = { ...style, 'background-image': hazeBackground(page.color === 'dark') };
  if (height !== 1) {
    // Névoa mais alta: mais folga em cima e embaixo, e a margem negativa mantém o texto no lugar (como o PDF)
    haze['padding-top'] = haze['padding-bottom'] = `${height}em`;
    if (page.text === 'bottom') {
      haze['margin-bottom'] = `${1 - height}em`;
    } else if (page.text !== 'middle') {
      haze['margin-top'] = `${1 - height}em`;
    }
  }
  return haze;
}

/** A posição da caixa de texto na página, em % (a mesma conta do PDF). */
export function textBoxStyle(page: PageDesign, trimMm: [number, number]): Record<string, string> {
  const [w, h] = trimMm;
  const inset = SAFE_MM;
  if (page.text === 'free') {
    return {
      left: `${page.x}%`,
      top: `${page.y}%`,
      width: `${page.w}%`,
      'text-align': page.align,
      'font-size': `${((PAGE_FONT_PT[page.size] * MM_PER_PT) / w) * 100}cqw`,
    };
  }
  const style: Record<string, string> = {
    left: `${(inset / w) * 100}%`,
    width: `${((w - 2 * inset) / w) * 100}%`,
    'text-align': page.align,
    // A letra proporcional à largura da página: cqw é 1% da largura do contêiner da prévia
    'font-size': `${((PAGE_FONT_PT[page.size] * MM_PER_PT) / w) * 100}cqw`,
  };
  if (page.text === 'top') {
    style['top'] = `${(inset / h) * 100}%`;
  } else if (page.text === 'middle') {
    style['top'] = '50%';
    style['transform'] = 'translateY(-50%)';
  } else {
    style['bottom'] = `${((inset + 1) / h) * 100}%`;
  }
  return style;
}

/**
 * O desenho da página do livro ilustrado (infantil), no editor: a prévia da página no formato do livro, com a
 * ilustração de fundo cobrindo tudo e o texto do capítulo por cima, e as escolhas de fundo e de texto. Cada mudança
 * sai em {@link pageChange}; o editor salva pela fila do salvamento automático.
 */
@Component({
  selector: 'app-page-designer',
  template: `
    <section class="page-designer" aria-label="Desenho da página" data-page-designer>
      <div class="preview-wrap" [class.spread]="page().spread">
        <div #preview class="preview" [style.aspect-ratio]="ratio()" [style.background-color]="page().background"
          data-page-preview>
          @if (imageUrl(); as url) {
            <img class="art" [src]="url" alt="" draggable="false" [style]="artBox()" (load)="artLoaded($event)"
              (pointerdown)="startArtDrag($event)" (pointermove)="moveDrag($event)" (pointerup)="endDrag($event)"
              (pointercancel)="endDrag($event)" title="Arraste para enquadrar a ilustração" data-page-art />
          }
          @for (box of textBoxes(); track box.index) {
            <div [class]="box.classes + (box.index === sel() && blockCount() > 1 ? ' selected' : '')
              + (dragging() ? ' dragging' : '')" [style]="box.style" [style.font-family]="box.font"
              [attr.data-page-text]="box.index === 0 ? '' : null" [attr.data-page-block]="box.index + 1"
              (pointerdown)="startDrag($event, box.index)" (pointermove)="moveDrag($event)" (pointerup)="endDrag($event)"
              (pointercancel)="endDrag($event)" title="Arraste para mudar o texto de lugar">
              @for (p of box.lines; track $index) {
                <p>{{ p }}</p>
              }
            </div>
          }
        </div>
      </div>

      <div class="controls">
        <div class="row">
          <span class="label">Fundo</span>
          <button type="button" class="chip" (click)="pickImage.emit()" data-page-image>
            <i class="pi pi-image" aria-hidden="true"></i> {{ page().imageId ? 'Trocar ilustração' : 'Escolher ilustração' }}
          </button>
          @if (page().imageId) {
            <button type="button" class="chip" (click)="set({ imageId: null })">Tirar</button>
          }
          <label class="chip color">
            <input type="color" [value]="page().background" (change)="set({ background: $any($event.target).value })"
              aria-label="Cor de fundo" />
            Cor
          </label>
        </div>
        @if (page().imageId) {
          <div class="row">
            <span class="label">Zoom</span>
            <input type="range" min="30" max="400" step="5" [value]="round(shown().zoom * 100)"
              aria-label="Zoom da ilustração" (input)="previewZoom($any($event.target).value)"
              (change)="commitZoom($any($event.target).value)" data-page-zoom />
            <span class="muted small zoom-value">{{ round(shown().zoom * 100) }}%</span>
            <button type="button" class="chip" (click)="set({ zoom: 1, imageX: 50, imageY: 50 })" data-page-art-reset>
              Enquadrar</button>
          </div>
        }
        <div class="row" data-page-blocks>
          <span class="label">Blocos</span>
          @if (blockCount() > 1) {
            @for (n of blockNumbers(); track n) {
              <button type="button" class="chip" [class.on]="sel() === n - 1" [attr.aria-pressed]="sel() === n - 1"
                [attr.aria-label]="'Bloco de texto ' + n" (click)="selected.set(n - 1)" [attr.data-page-pick-block]="n">
                {{ n }}</button>
            }
          }
          <button type="button" class="chip" (click)="addBlock.emit()" [disabled]="blockCount() > maxBoxes"
            data-page-add-block><i class="pi pi-plus" aria-hidden="true"></i> Bloco de texto</button>
          @if (sel() > 0) {
            <button type="button" class="chip" (click)="removeBlock.emit(sel())" data-page-remove-block>
              Tirar o bloco {{ sel() + 1 }}</button>
          }
        </div>
        @if (sel() === 0) {
          <div class="row" role="radiogroup" aria-label="Onde fica o texto">
            <span class="label">Texto</span>
            @for (t of texts; track t.value) {
              <button type="button" class="chip" role="radio" [class.on]="page().text === t.value"
                [attr.aria-checked]="page().text === t.value" (click)="set({ text: t.value })">{{ t.label }}</button>
            }
          </div>
        }
        @if (current().text === 'free') {
          <div class="row">
            <span class="label">Largura</span>
            <input type="range" min="15" max="100" step="1" [value]="shownBox().w" aria-label="Largura da caixa de texto"
              (input)="previewWidth($any($event.target).value)" (change)="commitWidth($any($event.target).value)"
              data-page-width />
            <span class="muted small">Arraste o texto na página para mudar de lugar.</span>
          </div>
        }
        @if (current().text !== 'none') {
          <div class="row">
            <span class="label">Letra</span>
            @for (s of sizes; track s.value) {
              <button type="button" class="chip" [class.on]="current().size === s.value" [attr.aria-pressed]="current().size === s.value"
                [attr.aria-label]="'Letra ' + s.label" (click)="setBox({ size: s.value })">{{ s.label }}</button>
            }
            @for (a of aligns; track a.value) {
              <button type="button" class="chip icon" [class.on]="current().align === a.value" [attr.aria-label]="a.label"
                [attr.aria-pressed]="current().align === a.value" (click)="setBox({ align: a.value })">
                <i class="pi" [class]="'pi ' + a.icon" aria-hidden="true"></i>
              </button>
            }
          </div>
          <div class="row">
            <label class="label" for="page-font">Fonte</label>
            <select id="page-font" class="font-select" [value]="current().font ?? ''" data-page-font
              (change)="setBox({ font: $any($event.target).value || null })">
              <option value="">A do livro ({{ bookFontName() }})</option>
              @for (f of fonts; track f.id) {
                <option [value]="f.id">{{ f.family }}{{ f.children ? ' (infantil)' : '' }}</option>
              }
            </select>
          </div>
          <div class="row">
            <span class="label">Cor</span>
            <button type="button" class="chip" [class.on]="current().color === 'dark'" (click)="setBox({ color: 'dark' })">Escura</button>
            <button type="button" class="chip" [class.on]="current().color === 'light'" (click)="setBox({ color: 'light' })">Clara</button>
          </div>
          <div class="row">
            <span class="label" title="O que fica atrás do texto">Atrás</span>
            <button type="button" class="chip" [class.on]="current().band" [attr.aria-pressed]="current().band"
              (click)="setBox({ band: !current().band, haze: false, blur: false })" data-page-band>Faixa</button>
            <button type="button" class="chip" [class.on]="current().haze" [attr.aria-pressed]="!!current().haze"
              (click)="setBox({ haze: !current().haze, band: false, blur: false })" data-page-haze
              title="A ilustração clareia atrás do texto, com a borda esfumada">Névoa</button>
            <button type="button" class="chip" [class.on]="current().blur" [attr.aria-pressed]="!!current().blur"
              (click)="setBox({ blur: !current().blur, band: false, haze: false })" data-page-blur
              title="A ilustração fica desfocada atrás do texto, com a borda esfumada">Desfoque</button>
          </div>
          @if (current().haze || current().blur) {
            <div class="row">
              <span class="label">Altura</span>
              <input type="range" min="50" max="400" step="10" [value]="round((shownBox().backdropHeight ?? 1) * 100)"
                [attr.aria-label]="'Altura da ' + (current().blur ? 'área desfocada' : 'névoa')"
                (input)="previewHeight($any($event.target).value)" (change)="commitHeight($any($event.target).value)"
                data-page-backdrop-height />
              <span class="muted small zoom-value">{{ round((shownBox().backdropHeight ?? 1) * 100) }}%</span>
            </div>
          }
        }
        <div class="row">
          <span class="label">Página</span>
          <button type="button" class="chip" [class.on]="!page().spread" (click)="set({ spread: false })">Simples</button>
          <button type="button" class="chip" [class.on]="page().spread" (click)="set({ spread: true })" data-page-spread>
            Dupla (livro aberto)</button>
          @if (page().spread && page().text !== 'none') {
            <button type="button" class="chip" [class.on]="page().textSide === 'left'" (click)="set({ textSide: 'left' })">
              Texto à esquerda</button>
            <button type="button" class="chip" [class.on]="page().textSide === 'right'" (click)="set({ textSide: 'right' })">
              Texto à direita</button>
          }
        </div>
        @if (dpiHint(); as hint) {
          <p class="dpi" [class.low]="!hint.ok" data-page-dpi>{{ hint.text }}</p>
        }
      </div>
    </section>
  `,
  styles: `
    .page-designer { display: flex; flex-direction: column; gap: .8rem; margin-bottom: 1.2rem; }
    .preview-wrap { display: flex; justify-content: center; }
    .preview { position: relative; overflow: hidden; width: min(100%, 420px); container-type: inline-size;
      border-radius: 4px; box-shadow: 0 2px 12px rgba(0, 0, 0, .35); }
    .preview-wrap.spread .preview { width: min(100%, 560px); }
    .art { position: absolute; max-width: none; cursor: grab; touch-action: none; user-select: none; }
    .zoom-value { min-width: 3rem; }
    .text { position: absolute; font-family: 'Literata', Georgia, serif; font-weight: 700; line-height: 1.3; }
    .text p { margin: 0 0 .35em; }
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
    .text { box-sizing: border-box; }
    .text.draggable { cursor: grab; touch-action: none; user-select: none; outline: 1px dashed transparent; }
    .text.draggable:hover, .text.dragging { outline-color: rgba(242, 140, 56, .9); }
    .text.dragging { cursor: grabbing; }
    .text.selected { outline: 1px dashed rgba(242, 140, 56, .9); }
    input[type='range'] { flex: 1 1 8rem; min-width: 8rem; accent-color: var(--bs-ember); }
    .controls { display: flex; flex-direction: column; gap: .45rem; }
    .row { display: flex; flex-wrap: wrap; align-items: center; gap: .35rem; }
    .label { width: 3.6rem; font-size: .8rem; color: var(--bs-text-soft); }
    .chip { min-height: 36px; padding: .25rem .7rem; border: 1px solid var(--bs-border); border-radius: 999px;
      background: var(--bs-surface); color: var(--bs-text); font: inherit; font-size: .85rem; cursor: pointer;
      display: inline-flex; align-items: center; gap: .35rem; }
    .chip.on { border-color: var(--bs-ember); background: rgba(242, 140, 56, .15); }
    .chip.icon { width: 36px; justify-content: center; padding: 0; }
    .chip.color input { width: 22px; height: 22px; border: 0; padding: 0; background: none; }
    .font-select { min-height: 36px; max-width: calc(100% - 4.2rem); padding: .25rem .6rem;
      border: 1px solid var(--bs-border); border-radius: 10px; background: var(--bs-surface); color: var(--bs-text);
      font: inherit; font-size: .85rem; }
    .dpi { margin: 0; font-size: .8rem; color: var(--bs-text-soft); }
    .dpi.low { color: #e0a24a; }
  `,
})
export class PageDesignerComponent {
  readonly page = input.required<PageDesign>();
  /** Endereço da ilustração de fundo (null = sem imagem, ou ainda carregando). */
  readonly imageUrl = input<string | null>(null);
  /** O texto da página: os parágrafos de cada bloco (a quebra de bloco separa um do outro). */
  readonly blocks = input<string[][]>([]);
  /** Largura e altura do corte do livro, em mm (a diagramação). */
  readonly trimMm = input<[number, number]>([200, 200]);
  /** O aviso de DPI da ilustração de fundo, se já dá para saber. */
  readonly dpiHint = input<{ text: string; ok: boolean } | null>(null);

  /** A fonte do livro (diagramação); a página pode ter a dela. */
  readonly bookFont = input<string>('literata');

  readonly pageChange = output<PageDesign>();
  readonly pickImage = output<void>();
  /** Pede um bloco de texto novo (o editor põe a quebra no texto e o bloco no desenho). */
  readonly addBlock = output<void>();
  /** Tira o bloco (o texto dele volta para o bloco anterior). */
  readonly removeBlock = output<number>();

  readonly maxBoxes = 8;
  /** O bloco escolhido para mudar (0 = o primeiro). */
  readonly selected = signal(0);
  readonly blockCount = computed(() => 1 + (this.page().boxes?.length ?? 0));
  readonly sel = computed(() => Math.min(this.selected(), this.blockCount() - 1));
  readonly blockNumbers = computed(() => Array.from({ length: this.blockCount() }, (_, i) => i + 1));
  /** O bloco escolhido, salvo e na prévia (durante o arraste). */
  readonly current = computed(() => boxView(this.page(), this.sel()));
  readonly shownBox = computed(() => boxView(this.shown(), this.sel()));

  readonly texts = TEXTS;
  readonly aligns = ALIGNS;
  readonly sizes = SIZES;
  readonly fonts = BOOK_FONTS;
  readonly bookFontName = computed(() => bookFont(this.bookFont()).family);
  /** Os blocos de texto na prévia: o texto de cada um e o desenho dele (fonte carregada sob demanda). */
  readonly textBoxes = computed(() => {
    const page = this.shown();
    const [trimW] = this.trimMm();
    return fitBlocks(page, this.blocks())
      .map((lines, index) => {
        const view = boxView(page, index);
        const fontId = view.font ?? this.bookFont();
        loadBookFonts([fontId]);
        return {
          index, lines, view,
          style: withBackdrop(view, previewTextStyle(view, this.trimMm()), trimW),
          font: fontFamilyCss(fontId),
          classes: 'text draggable ' + view.color + (view.band ? ' band' : '') + (view.haze ? ' haze' : '')
            + (view.blur ? ' blur' : ''),
        };
      })
      .filter((box) => box.lines.length > 0 && box.view.text !== 'none');
  });

  /** Proporção da prévia: a página, ou o livro aberto na dupla. */
  readonly ratio = computed(() => {
    const [w, h] = this.trimMm();
    return `${this.page().spread ? w * 2 : w} / ${h}`;
  });

  /** O desenho que a prévia mostra: durante o arraste, a posição nova (ainda não salva). */
  private readonly draft = signal<PageDesign | null>(null);
  readonly dragging = signal(false);
  readonly shown = computed(() => this.draft() ?? this.page());
  private readonly previewRef = viewChild<ElementRef<HTMLElement>>('preview');
  private start: { pointerX: number; pointerY: number; x: number; y: number; w: number; mode: 'text' | 'art'; box: number } | null = null;
  /** Largura ÷ altura da ilustração de fundo (para cobrir a página como o PDF). */
  private readonly imageRatio = signal(1);

  readonly artBox = computed(() => {
    const [w, h] = this.trimMm();
    return artStyle(this.shown(), (this.page().spread ? 2 * w : w) / h, this.imageRatio());
  });

  readonly round = Math.round;

  artLoaded(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img.naturalWidth && img.naturalHeight) {
      this.imageRatio.set(img.naturalWidth / img.naturalHeight);
    }
  }

  /** Pega a ilustração para enquadrar: arrastar move o centro dela. */
  startArtDrag(event: PointerEvent): void {
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
    const page = this.page();
    this.start = { pointerX: event.clientX, pointerY: event.clientY, x: page.imageX, y: page.imageY, w: 0, mode: 'art', box: 0 };
    this.dragging.set(true);
    event.preventDefault();
  }

  previewZoom(value: string): void {
    this.draft.set({ ...this.page(), zoom: Number(value) / 100 });
  }

  commitZoom(value: string): void {
    this.draft.set(null);
    this.pageChange.emit({ ...this.page(), zoom: Number(value) / 100 });
  }

  set(change: Partial<PageDesign>): void {
    this.pageChange.emit({ ...this.page(), ...change });
  }

  /** Muda o bloco escolhido (letra, cor, fonte, fundo, largura). */
  setBox(change: Partial<PageDesign>): void {
    this.pageChange.emit(withBoxChange(this.page(), this.sel(), change));
  }

  previewHeight(value: string): void {
    this.draft.set(withBoxChange(this.page(), this.sel(), { backdropHeight: Number(value) / 100 }));
  }

  commitHeight(value: string): void {
    this.draft.set(null);
    this.setBox({ backdropHeight: Number(value) / 100 });
  }

  /** Pega a caixa de texto: guarda onde ela está, em % do contêiner (no modo fixo, onde ela aparece agora). */
  startDrag(event: PointerEvent, index = 0): void {
    this.selected.set(index);
    const preview = this.previewRef()?.nativeElement;
    const box = event.currentTarget as HTMLElement;
    if (!preview) {
      return;
    }
    const area = preview.getBoundingClientRect();
    const rect = box.getBoundingClientRect();
    box.setPointerCapture?.(event.pointerId);
    this.start = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      x: ((rect.left - area.left) / area.width) * 100,
      y: ((rect.top - area.top) / area.height) * 100,
      w: (rect.width / area.width) * 100,
      mode: 'text',
      box: index,
    };
    this.dragging.set(true);
    event.preventDefault();
  }

  moveDrag(event: PointerEvent): void {
    const preview = this.previewRef()?.nativeElement;
    if (!this.start || !preview) {
      return;
    }
    const area = preview.getBoundingClientRect();
    const dx = ((event.clientX - this.start.pointerX) / area.width) * 100;
    const dy = ((event.clientY - this.start.pointerY) / area.height) * 100;
    if (this.start.mode === 'art') {
      const clamp = (v: number) => Math.round(Math.min(150, Math.max(-50, v)) * 10) / 10;
      this.draft.set({ ...this.page(), imageX: clamp(this.start.x + dx), imageY: clamp(this.start.y + dy) });
      return;
    }
    const box = clampBox(this.start.x + dx, this.start.y + dy, this.start.w);
    this.draft.set(withBoxChange(this.page(), this.start.box, { text: 'free', ...box }));
  }

  /** Solta: salva uma vez, no lugar novo. */
  endDrag(event: PointerEvent): void {
    if (!this.start) {
      return;
    }
    (event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId);
    this.start = null;
    this.dragging.set(false);
    const moved = this.draft();
    this.draft.set(null);
    if (moved) {
      this.pageChange.emit(moved);
    }
  }

  previewWidth(value: string): void {
    const box = this.current();
    this.draft.set(withBoxChange(this.page(), this.sel(), clampBox(box.x, box.y, Number(value))));
  }

  commitWidth(value: string): void {
    const box = this.current();
    this.draft.set(null);
    this.setBox(clampBox(box.x, box.y, Number(value)));
  }
}
