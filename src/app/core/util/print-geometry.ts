import { BookLayout } from '../models/api.models';

/** Onde a ilustração fica na página (atributo `size` do bloco); null = automático (tamanho natural, como antes). */
export type IllustrationSize = 'small' | 'medium' | 'wide' | 'page' | 'bleed' | 'spread';
export type IllustrationAlign = 'center' | 'left' | 'right';

export const ILLUSTRATION_SIZES: { value: IllustrationSize; label: string }[] = [
  { value: 'wide', label: 'Largura do texto' },
  { value: 'medium', label: 'Média' },
  { value: 'small', label: 'Pequena' },
  { value: 'page', label: 'Página só dela' },
  { value: 'bleed', label: 'Página inteira, até a borda' },
  { value: 'spread', label: 'Página dupla' },
];

export const ILLUSTRATION_ALIGNS: { value: IllustrationAlign; label: string }[] = [
  { value: 'center', label: 'No meio' },
  { value: 'left', label: 'À esquerda' },
  { value: 'right', label: 'À direita' },
];

/** O que as gráficas pedem. */
export const MIN_DPI = 300;

/** Medidas da página do PDF diagramado, em mm (as mesmas do PdfWriter no servidor). */
export interface PrintGeometry {
  pageWidthMm: number;
  pageHeightMm: number;
  textWidthMm: number;
  textHeightMm: number;
}

/** Largura e altura do corte, em mm (as mesmas do BookLayout no servidor). */
export const TRIM_MM: Record<string, [number, number]> = {
  a5: [148, 210],
  '14x21': [140, 210],
  '16x23': [160, 230],
  '17x24': [170, 240],
  '6x9': [152.4, 228.6],
  '15x15': [150, 150],
  '20x20': [200, 200],
  '21x21': [210, 210],
  '25x25': [250, 250],
  '8.5x8.5': [215.9, 215.9],
  '8.25x8.25': [209.6, 209.6],
  '21x15': [210, 150],
  '25x20': [250, 200],
  '28x21': [280, 210],
  '8.25x6': [209.6, 152.4],
};

/** Sangria do miolo, em mm. */
export const BLEED_MM = 3.2;

/** Em cima, dos lados, embaixo. */
const MARGINS: Record<string, [number, number, number]> = {
  narrow: [16, 13, 18],
  normal: [20, 17, 22],
  wide: [24, 21, 26],
};

const MAX_HEIGHT_MM = 140;
const CAPTION_SPACE_MM = 12;
const MM_PER_INCH = 25.4;
const MM_PER_CSS_PX = MM_PER_INCH / 96;

/** O corte (sem sangria) do livro, em mm. */
export function trimSize(layout: Pick<BookLayout, 'trim'> & Partial<Pick<BookLayout, 'customWidthMm' | 'customHeightMm'>>): [number, number] {
  if (layout.trim === 'custom' && layout.customWidthMm && layout.customHeightMm) {
    return [layout.customWidthMm, layout.customHeightMm];
  }
  return TRIM_MM[layout.trim] ?? TRIM_MM['a5'];
}

/** Medidas para o DPI: a página (com a sangria, se houver) e a área de texto. */
export function printGeometry(
  layout: Pick<BookLayout, 'trim' | 'margins'> & Partial<Pick<BookLayout, 'customWidthMm' | 'customHeightMm' | 'bleed'>>,
): PrintGeometry {
  const [w, h] = trimSize(layout);
  const [top, side, bottom] = MARGINS[layout.margins] ?? MARGINS['normal'];
  const bleed = layout.bleed ? BLEED_MM : 0;
  return { pageWidthMm: w + bleed, pageHeightMm: h + 2 * bleed, textWidthMm: w - 2 * side, textHeightMm: h - top - bottom };
}

const FRACTION: Record<string, number> = { small: 0.4, medium: 0.65, wide: 1 };

/** Largura impressa (mm) e DPI da imagem no lugar escolhido; espelha `Placement.fit` do servidor. */
export function printDpi(
  size: IllustrationSize | null,
  widthPx: number,
  heightPx: number,
  geometry: PrintGeometry,
  caption: boolean,
): { widthMm: number; dpi: number } {
  const ratio = heightPx / widthPx;
  let widthMm: number;
  switch (size) {
    case 'small':
    case 'medium':
    case 'wide': {
      widthMm = geometry.textWidthMm * FRACTION[size];
      if (widthMm * ratio > MAX_HEIGHT_MM) {
        widthMm = MAX_HEIGHT_MM / ratio;
      }
      break;
    }
    case 'page': {
      const boxH = geometry.textHeightMm - (caption ? CAPTION_SPACE_MM : 0);
      widthMm = widthPx * Math.min(geometry.textWidthMm / widthPx, boxH / heightPx);
      break;
    }
    case 'bleed':
    case 'spread': {
      const boxW = size === 'spread' ? geometry.pageWidthMm * 2 : geometry.pageWidthMm;
      widthMm = widthPx * Math.max(boxW / widthPx, geometry.pageHeightMm / heightPx);
      break;
    }
    default: {
      const w = widthPx * MM_PER_CSS_PX;
      const h = heightPx * MM_PER_CSS_PX;
      widthMm = w * Math.min(1, Math.min(geometry.textWidthMm / w, MAX_HEIGHT_MM / h));
    }
  }
  return { widthMm, dpi: Math.floor(widthPx / (widthMm / MM_PER_INCH) + 0.001) };
}

/** O aviso curto que aparece embaixo da ilustração no editor. */
export function dpiHint(dpi: number): { text: string; ok: boolean } {
  return dpi >= MIN_DPI
    ? { text: `Impressão: ${dpi} DPI, nítida`, ok: true }
    : { text: `Impressão: ${dpi} DPI, pode sair borrada (o ideal é ${MIN_DPI})`, ok: false };
}
