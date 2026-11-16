import { Component, computed, input, output } from '@angular/core';

import { PageDesign } from '../../../core/models/api.models';

/** Corpo da letra de cada tamanho, em pontos (o mesmo do PageDesign no servidor). */
export const PAGE_FONT_PT: Record<PageDesign['size'], number> = { s: 16, m: 20, l: 26, xl: 34 };
/** Distância do texto até o corte, em mm (a área segura do PDF). */
export const SAFE_MM = 12;
const MM_PER_PT = 25.4 / 72;

export const DEFAULT_PAGE: PageDesign = {
  imageId: null, background: '#ffffff', text: 'bottom', align: 'center', size: 'l', color: 'dark', band: false,
  spread: false, textSide: 'right',
};

const TEXTS: { value: PageDesign['text']; label: string }[] = [
  { value: 'top', label: 'Em cima' },
  { value: 'middle', label: 'No meio' },
  { value: 'bottom', label: 'Embaixo' },
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

/** A posição da caixa de texto na prévia, em % da página (a mesma conta do PDF). */
export function textBoxStyle(page: PageDesign, trimMm: [number, number]): Record<string, string> {
  const [w, h] = trimMm;
  const inset = SAFE_MM;
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
        <div class="preview" [style.aspect-ratio]="ratio()" [style.background-color]="page().background"
          data-page-preview>
          @if (imageUrl(); as url) {
            <img class="art" [src]="url" alt="" [class.spread-half]="page().spread" />
          }
          @if (page().text !== 'none' && paragraphs().length) {
            <div class="text" [class]="'text ' + page().color + (page().band ? ' band' : '')" [style]="boxStyle()"
              data-page-text>
              @for (p of paragraphs(); track $index) {
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
        <div class="row" role="radiogroup" aria-label="Onde fica o texto">
          <span class="label">Texto</span>
          @for (t of texts; track t.value) {
            <button type="button" class="chip" role="radio" [class.on]="page().text === t.value"
              [attr.aria-checked]="page().text === t.value" (click)="set({ text: t.value })">{{ t.label }}</button>
          }
        </div>
        @if (page().text !== 'none') {
          <div class="row">
            <span class="label">Letra</span>
            @for (s of sizes; track s.value) {
              <button type="button" class="chip" [class.on]="page().size === s.value" [attr.aria-pressed]="page().size === s.value"
                [attr.aria-label]="'Letra ' + s.label" (click)="set({ size: s.value })">{{ s.label }}</button>
            }
            @for (a of aligns; track a.value) {
              <button type="button" class="chip icon" [class.on]="page().align === a.value" [attr.aria-label]="a.label"
                [attr.aria-pressed]="page().align === a.value" (click)="set({ align: a.value })">
                <i class="pi" [class]="'pi ' + a.icon" aria-hidden="true"></i>
              </button>
            }
          </div>
          <div class="row">
            <span class="label">Cor</span>
            <button type="button" class="chip" [class.on]="page().color === 'dark'" (click)="set({ color: 'dark' })">Escura</button>
            <button type="button" class="chip" [class.on]="page().color === 'light'" (click)="set({ color: 'light' })">Clara</button>
            <button type="button" class="chip" [class.on]="page().band" [attr.aria-pressed]="page().band"
              (click)="set({ band: !page().band })" data-page-band>Faixa atrás do texto</button>
          </div>
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
    .art { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
    .text { position: absolute; font-family: 'Literata', Georgia, serif; font-weight: 700; line-height: 1.3; }
    .text p { margin: 0 0 .35em; }
    .text.dark { color: #1a1a1a; }
    .text.light { color: #fff; }
    .text.band.dark { background: rgba(255, 255, 255, .82); padding: .5em .7em; border-radius: .5em; }
    .text.band.light { background: rgba(0, 0, 0, .6); padding: .5em .7em; border-radius: .5em; }
    .controls { display: flex; flex-direction: column; gap: .45rem; }
    .row { display: flex; flex-wrap: wrap; align-items: center; gap: .35rem; }
    .label { width: 3.6rem; font-size: .8rem; color: var(--bs-text-soft); }
    .chip { min-height: 36px; padding: .25rem .7rem; border: 1px solid var(--bs-border); border-radius: 999px;
      background: var(--bs-surface); color: var(--bs-text); font: inherit; font-size: .85rem; cursor: pointer;
      display: inline-flex; align-items: center; gap: .35rem; }
    .chip.on { border-color: var(--bs-ember); background: rgba(242, 140, 56, .15); }
    .chip.icon { width: 36px; justify-content: center; padding: 0; }
    .chip.color input { width: 22px; height: 22px; border: 0; padding: 0; background: none; }
    .dpi { margin: 0; font-size: .8rem; color: var(--bs-text-soft); }
    .dpi.low { color: #e0a24a; }
  `,
})
export class PageDesignerComponent {
  readonly page = input.required<PageDesign>();
  /** Endereço da ilustração de fundo (null = sem imagem, ou ainda carregando). */
  readonly imageUrl = input<string | null>(null);
  /** O texto da página, um item por parágrafo. */
  readonly paragraphs = input<string[]>([]);
  /** Largura e altura do corte do livro, em mm (a diagramação). */
  readonly trimMm = input<[number, number]>([200, 200]);
  /** O aviso de DPI da ilustração de fundo, se já dá para saber. */
  readonly dpiHint = input<{ text: string; ok: boolean } | null>(null);

  readonly pageChange = output<PageDesign>();
  readonly pickImage = output<void>();

  readonly texts = TEXTS;
  readonly aligns = ALIGNS;
  readonly sizes = SIZES;

  /** Proporção da prévia: a página, ou o livro aberto na dupla. */
  readonly ratio = computed(() => {
    const [w, h] = this.trimMm();
    return `${this.page().spread ? w * 2 : w} / ${h}`;
  });

  readonly boxStyle = computed(() => {
    const [w, h] = this.trimMm();
    const style = textBoxStyle(this.page(), [w, h]);
    if (!this.page().spread) {
      return style;
    }
    // Na dupla, o texto fica numa das metades
    const half = (value: string) => `${parseFloat(value) / 2}%`;
    const left = parseFloat(style['left']) / 2 + (this.page().textSide === 'right' ? 50 : 0);
    return { ...style, left: `${left}%`, width: half(style['width']), 'font-size': half(style['font-size']).replace('%', 'cqw') };
  });

  set(change: Partial<PageDesign>): void {
    this.pageChange.emit({ ...this.page(), ...change });
  }
}
