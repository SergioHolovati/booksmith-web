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

const TRIMS: Record<string, [number, number]> = {
  a5: [148, 210],
  '14x21': [140, 210],
  '16x23': [160, 230],
  '6x9': [152.4, 228.6],
};

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

export function printGeometry(layout: Pick<BookLayout, 'trim' | 'margins'>): PrintGeometry {
  const [w, h] = TRIMS[layout.trim] ?? TRIMS['a5'];
  const [top, side, bottom] = MARGINS[layout.margins] ?? MARGINS['normal'];
  return { pageWidthMm: w, pageHeightMm: h, textWidthMm: w - 2 * side, textHeightMm: h - top - bottom };
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
