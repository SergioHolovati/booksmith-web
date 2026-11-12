import { PrintCoverSpec } from '../../../core/models/api.models';

/** Os tamanhos de livro da diagramação, com o rótulo da tela. */
export const TRIM_OPTIONS: { value: string; label: string; widthMm: number; heightMm: number }[] = [
  { value: 'a5', label: 'A5', widthMm: 148, heightMm: 210 },
  { value: '14x21', label: '14×21', widthMm: 140, heightMm: 210 },
  { value: '16x23', label: '16×23', widthMm: 160, heightMm: 230 },
  { value: '6x9', label: '6×9"', widthMm: 152.4, heightMm: 228.6 },
];

/** O que o autor informa ao importar a capa (tudo opcional). */
export interface CoverSpecInput {
  trim: string | null;
  spineMm: number | null;
  bleedMm: number | null;
}

const NUMBER = String.raw`(\d+(?:[.,]\d+)?)`;

function number(text: string): number {
  return Number(text.replace(',', '.'));
}

/**
 * Lê uma especificação escrita (a do designer, da gráfica ou de outra IA) e tira o tamanho do livro, a lombada e
 * a sangria. Medidas que não são tamanho de livro (a capa aberta, "378 × 240 mm") ficam de fora.
 */
export function parseCoverSpec(text: string): Partial<CoverSpecInput> {
  const found: Partial<CoverSpecInput> = {};
  const lower = text.toLowerCase();
  if (/\ba5\b/.test(lower)) {
    found.trim = 'a5';
  }
  const pairs = lower.matchAll(new RegExp(`${NUMBER}\\s*[x×]\\s*${NUMBER}\\s*(cm|mm|"|pol|in)?`, 'g'));
  for (const [, a, b, unit] of pairs) {
    const w = number(a);
    const h = number(b);
    const inches = unit === '"' || unit === 'pol' || unit === 'in' || (!unit && w === 6 && h === 9);
    const scale = unit === 'mm' ? 1 : inches ? 25.4 : 10;
    const match = TRIM_OPTIONS.find(
      (t) => Math.abs(t.widthMm - w * scale) <= 1.5 && Math.abs(t.heightMm - h * scale) <= 1.5,
    );
    if (match) {
      found.trim = match.value;
      break;
    }
  }
  const spine = lower.match(new RegExp(`lombada[^0-9\\n]{0,20}${NUMBER}\\s*mm`));
  if (spine) {
    found.spineMm = number(spine[1]);
  }
  const bleed = lower.match(new RegExp(`sangria[^0-9\\n]{0,20}${NUMBER}\\s*mm`));
  if (bleed) {
    found.bleedMm = number(bleed[1]);
  }
  return found;
}

function mm(value: number): string {
  return value.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
}

/**
 * O modelo de especificação para quem for fazer a capa: as medidas que este livro pede, na gráfica escolhida.
 * Copiado da tela e mandado ao designer (ou colado de volta na importação).
 */
export function specTemplate(spec: PrintCoverSpec, title: string, author: string | null, profileLabel: string): string {
  const trim = TRIM_OPTIONS.find(
    (t) => Math.abs(t.widthMm - spec.trimWidthMm) < 0.5 && Math.abs(t.heightMm - spec.trimHeightMm) < 0.5,
  );
  const size = trim?.value === '6x9' ? '6 × 9 pol.' : `${mm(spec.trimWidthMm / 10)} × ${mm(spec.trimHeightMm / 10)} cm`;
  const ebookHeight = Math.round((1800 * spec.trimHeightMm) / spec.trimWidthMm);
  return [
    `Capa — ${title}${author ? ` (${author})` : ''}`,
    '',
    `Tamanho do livro: ${size} (${mm(spec.trimWidthMm)} × ${mm(spec.trimHeightMm)} mm).`,
    `Miolo: ${spec.pages} páginas. Gráfica: ${profileLabel}.`,
    `Lombada: ${mm(spec.spineMm)} mm. Confirme com a gráfica antes de fechar a arte: muda com o papel e o número de páginas.`,
    `Sangria: ${mm(spec.bleedMm)} mm em volta.`,
    `Capa aberta com sangria: ${mm(spec.widthMm)} × ${mm(spec.heightMm)} mm (contracapa + lombada + frente).`,
    '',
    'Impressão: PDF de uma página deitada nessa medida. Marcas de corte em volta podem vir; o Booksmith tira na hora de entregar à gráfica.',
    'Cores em CMYK, imagens a 300 dpi; textos e logotipos a pelo menos 3 mm do corte e longe da dobra da lombada.',
    `E-book: JPG da frente sem sangria, 1800 × ${ebookHeight} px, RGB.`,
  ].join('\n');
}
