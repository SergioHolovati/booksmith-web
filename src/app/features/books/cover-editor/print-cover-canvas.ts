import { CoverDesign, PrintCoverSpec } from '../../../core/models/api.models';
import { Box, drawCover, fontFamily, wrapText } from './cover-canvas';

/** 300 DPI, o que as gráficas pedem: pixels por milímetro. */
export const PRINT_PX_PER_MM = 300 / 25.4;

/** Margem de segurança dentro do corte, em mm: texto não chega perto da borda nem da dobra da lombada. */
const SAFE_MM = 6;

/** Pixels da capa aberta numa escala (px por mm). */
export function printSize(spec: PrintCoverSpec, pxPerMm: number): { width: number; height: number } {
  return { width: Math.round(spec.widthMm * pxPerMm), height: Math.round(spec.heightMm * pxPerMm) };
}

/** Onde fica cada parte, em mm a partir da esquerda: contracapa, lombada e frente (com a sangria por fora). */
export function printPanels(spec: PrintCoverSpec): { backEnd: number; spineEnd: number } {
  const backEnd = spec.bleedMm + spec.trimWidthMm;
  return { backEnd, spineEnd: backEnd + spec.spineMm };
}

/**
 * Desenha a capa aberta: contracapa (texto e autor), lombada (título e autor, de cima para baixo) e a frente,
 * igual à do editor. {@code guides}: linhas de corte e de dobra, só para a prévia na tela.
 */
export function drawPrintCover(
  ctx: CanvasRenderingContext2D,
  design: CoverDesign,
  image: HTMLImageElement | null,
  spec: PrintCoverSpec,
  options: { pxPerMm: number; guides: boolean; frontImage?: HTMLImageElement | null },
): void {
  const k = options.pxPerMm;
  const { width, height } = printSize(spec, k);
  const { backEnd, spineEnd } = printPanels(spec);
  const family = fontFamily(design.font);
  const back = design.template === 'band' ? design.accentColor : design.backgroundColor;

  ctx.clearRect(0, 0, width, height);
  // Contracapa e lombada: a cor de fundo (na Faixa, a cor da faixa, que segue da frente)
  ctx.fillStyle = back;
  ctx.fillRect(0, 0, Math.round(spineEnd * k), height);

  // Frente: do começo dela até a sangria da direita. Com a capa importada em PDF, a imagem dela (o servidor põe
  // o PDF original por cima, como vetor)
  const front = { x: spineEnd * k, y: 0, w: width - spineEnd * k, h: height };
  if (options.frontImage) {
    coverImage(ctx, options.frontImage, front);
  } else {
    drawCover(ctx, design, image, front);
  }

  ctx.fillStyle = design.textColor;
  ctx.textBaseline = 'top';

  // Contracapa: o texto em cima; embaixo à direita fica livre para o código de barras
  const left = (spec.bleedMm + SAFE_MM + 6) * k;
  const textWidth = (spec.trimWidthMm - 2 * SAFE_MM - 12) * k;
  const size = 4.2 * k;
  ctx.textAlign = 'left';
  ctx.font = `400 ${size}px ${family}`;
  let y = (spec.bleedMm + SAFE_MM + 14) * k;
  const bottom = (spec.bleedMm + spec.trimHeightMm * 0.7) * k;
  for (const paragraph of (design.backText ?? '').split('\n').filter((p) => p.trim())) {
    for (const line of wrapText((t) => ctx.measureText(t).width, paragraph.trim(), textWidth)) {
      if (y + size > bottom) {
        break;
      }
      ctx.fillText(line, left, y);
      y += size * 1.45;
    }
    y += size * 0.8;
  }
  if (design.author) {
    ctx.font = `600 ${3.6 * k}px ${family}`;
    ctx.fillText(design.author, left, (spec.bleedMm + spec.trimHeightMm - SAFE_MM - 16) * k);
  }

  // Lombada: título e autor girados, lidos de cima para baixo
  if (spec.spineText) {
    const spineCenter = (backEnd + spec.spineMm / 2) * k;
    const spineSize = Math.min(spec.spineMm * 0.5, 6) * k;
    ctx.save();
    ctx.translate(spineCenter, (spec.bleedMm + SAFE_MM) * k);
    ctx.rotate(Math.PI / 2);
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.font = `600 ${spineSize}px ${family}`;
    ctx.fillText(design.title, 4 * k, 0, (spec.trimHeightMm * 0.62) * k);
    if (design.author) {
      ctx.textAlign = 'right';
      ctx.font = `400 ${spineSize * 0.8}px ${family}`;
      ctx.fillText(design.author, (spec.trimHeightMm - 2 * SAFE_MM - 4) * k, 0, (spec.trimHeightMm * 0.3) * k);
    }
    ctx.restore();
  }

  if (options.guides) {
    drawGuides(ctx, spec, k, { backEnd, spineEnd });
  }
}

/** A imagem cobrindo o retângulo, cortando o que sobra. */
function coverImage(ctx: CanvasRenderingContext2D, image: HTMLImageElement, { x, y, w, h }: Box): void {
  const scale = Math.max(w / image.naturalWidth, h / image.naturalHeight);
  const sw = w / scale;
  const sh = h / scale;
  ctx.drawImage(image, (image.naturalWidth - sw) / 2, (image.naturalHeight - sh) / 2, sw, sh, x, y, w, h);
}

/** Linha tracejada no corte (sangria) e nas dobras da lombada; só na tela. */
function drawGuides(ctx: CanvasRenderingContext2D, spec: PrintCoverSpec, k: number, panels: { backEnd: number; spineEnd: number }): void {
  const { width, height } = printSize(spec, k);
  ctx.save();
  ctx.setLineDash([2 * k, 1.5 * k]);
  ctx.lineWidth = Math.max(1, 0.35 * k);
  ctx.strokeStyle = 'rgba(255, 64, 64, 0.9)';
  ctx.strokeRect(spec.bleedMm * k, spec.bleedMm * k, width - 2 * spec.bleedMm * k, height - 2 * spec.bleedMm * k);
  ctx.strokeStyle = 'rgba(64, 160, 255, 0.9)';
  for (const x of [panels.backEnd, panels.spineEnd]) {
    ctx.beginPath();
    ctx.moveTo(x * k, 0);
    ctx.lineTo(x * k, height);
    ctx.stroke();
  }
  ctx.restore();
}
