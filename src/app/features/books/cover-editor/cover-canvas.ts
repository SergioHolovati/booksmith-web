import { CoverDesign } from '../../../core/models/api.models';

/** Tamanho da capa gerada: 1600 × 2560 (proporção 1:1,6, a recomendada para capa de e-book). */
export const COVER_WIDTH = 1600;
export const COVER_HEIGHT = 2560;

const TITLE_SIZES: Record<CoverDesign['titleSize'], number> = { s: 130, m: 170, l: 220 };

export function fontFamily(font: CoverDesign['font']): string {
  return font === 'sans' ? 'Inter, sans-serif' : 'Literata, Georgia, serif';
}

/** Quebra o texto em linhas que cabem em {@code maxWidth}; palavra maior que a linha fica sozinha. */
export function wrapText(measure: (text: string) => number, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && measure(candidate) > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) {
    lines.push(line);
  }
  return lines;
}

/**
 * Escreve um bloco de texto e devolve onde ele terminou (y). Se passar de {@code maxLines}, a letra diminui até
 * caber (ou até 45% do tamanho pedido).
 */
function block(
  ctx: CanvasRenderingContext2D,
  text: string,
  options: { x: number; y: number; width: number; size: number; weight: string; family: string; italic?: boolean; maxLines: number; align: CanvasTextAlign },
): number {
  let size = options.size;
  let lines: string[];
  for (;;) {
    ctx.font = `${options.italic ? 'italic ' : ''}${options.weight} ${size}px ${options.family}`;
    lines = wrapText((t) => ctx.measureText(t).width, text, options.width);
    if (lines.length <= options.maxLines || size <= options.size * 0.45) {
      break;
    }
    size = Math.round(size * 0.9);
  }
  ctx.textAlign = options.align;
  ctx.textBaseline = 'top';
  const lineHeight = size * 1.15;
  lines.forEach((line, i) => ctx.fillText(line, options.x, options.y + i * lineHeight));
  return options.y + lines.length * lineHeight;
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Imagem cobrindo o retângulo, cortando o que sobra (como object-fit: cover). */
function cover(ctx: CanvasRenderingContext2D, image: HTMLImageElement, { x, y, w, h }: Box): void {
  const scale = Math.max(w / image.naturalWidth, h / image.naturalHeight);
  const sw = w / scale;
  const sh = h / scale;
  ctx.drawImage(image, (image.naturalWidth - sw) / 2, (image.naturalHeight - sh) / 2, sw, sh, x, y, w, h);
}

function shade(ctx: CanvasRenderingContext2D, amount: number, { x, y, w, h }: Box): void {
  if (amount > 0) {
    ctx.fillStyle = `rgba(0, 0, 0, ${amount / 100})`;
    ctx.fillRect(x, y, w, h);
  }
}

/** Desenha a capa inteira no contexto (1600 × 2560). {@code image}: o fundo já carregado, ou null. */
export function drawCover(ctx: CanvasRenderingContext2D, design: CoverDesign, image: HTMLImageElement | null): void {
  const W = COVER_WIDTH;
  const H = COVER_HEIGHT;
  const family = fontFamily(design.font);
  const titleSize = TITLE_SIZES[design.titleSize];
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = design.backgroundColor;
  ctx.fillRect(0, 0, W, H);

  if (design.template === 'band') {
    const bandTop = H * 0.62;
    if (image) {
      cover(ctx, image, { x: 0, y: 0, w: W, h: bandTop });
      shade(ctx, design.shade, { x: 0, y: 0, w: W, h: bandTop });
    }
    ctx.fillStyle = design.accentColor;
    ctx.fillRect(0, bandTop, W, H - bandTop);
    ctx.fillStyle = design.textColor;
    const margin = W * 0.08;
    const y = block(ctx, design.title, { x: margin, y: bandTop + H * 0.05, width: W - 2 * margin, size: titleSize, weight: '600', family, maxLines: 3, align: 'left' });
    if (design.subtitle) {
      block(ctx, design.subtitle, { x: margin, y: y + 30, width: W - 2 * margin, size: titleSize * 0.4, weight: '400', family, italic: design.font === 'serif', maxLines: 2, align: 'left' });
    }
    if (design.author) {
      block(ctx, design.author, { x: margin, y: H * 0.9, width: W - 2 * margin, size: 72, weight: '400', family, maxLines: 1, align: 'left' });
    }
    return;
  }

  if (design.template === 'minimal') {
    if (image) {
      const size = W * 0.56;
      const box = { x: (W - size) / 2, y: H * 0.4, w: size, h: size };
      cover(ctx, image, box);
      shade(ctx, design.shade, box);
    }
    ctx.strokeStyle = design.accentColor;
    ctx.lineWidth = 8;
    ctx.strokeRect(80, 80, W - 160, H - 160);
    ctx.fillStyle = design.textColor;
    const y = block(ctx, design.title, { x: W / 2, y: H * 0.14, width: W * 0.74, size: titleSize, weight: '600', family, maxLines: 4, align: 'center' });
    if (design.subtitle) {
      block(ctx, design.subtitle, { x: W / 2, y: y + 30, width: W * 0.7, size: titleSize * 0.4, weight: '400', family, italic: design.font === 'serif', maxLines: 2, align: 'center' });
    }
    if (design.author) {
      block(ctx, design.author, { x: W / 2, y: H * 0.85, width: W * 0.74, size: 76, weight: '400', family, maxLines: 2, align: 'center' });
    }
    return;
  }

  // Clássica: a imagem ocupa tudo; título no alto, autor embaixo
  if (image) {
    cover(ctx, image, { x: 0, y: 0, w: W, h: H });
    shade(ctx, design.shade, { x: 0, y: 0, w: W, h: H });
  }
  ctx.fillStyle = design.textColor;
  ctx.shadowColor = image ? 'rgba(0, 0, 0, 0.45)' : 'transparent';
  ctx.shadowBlur = image ? 24 : 0;
  const y = block(ctx, design.title, { x: W / 2, y: H * 0.12, width: W * 0.84, size: titleSize, weight: '600', family, maxLines: 4, align: 'center' });
  if (design.subtitle) {
    block(ctx, design.subtitle, { x: W / 2, y: y + 30, width: W * 0.78, size: titleSize * 0.4, weight: '400', family, italic: design.font === 'serif', maxLines: 2, align: 'center' });
  }
  if (design.author) {
    block(ctx, design.author, { x: W / 2, y: H * 0.88, width: W * 0.84, size: 80, weight: '400', family, maxLines: 2, align: 'center' });
  }
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
}
