import { CoverDesign, PrintCoverSpec } from '../../../core/models/api.models';
import { Box, drawCover, fontFamily, wrapText } from './cover-canvas';
import { drawBarcode, isbn13 } from './isbn-barcode';

/** 300 DPI, o que as gráficas pedem: pixels por milímetro. */
export const PRINT_PX_PER_MM = 300 / 25.4;

/** Margem de segurança dentro do corte, em mm: texto não chega perto da borda nem da dobra da lombada. */
const SAFE_MM = 6;

/** Pixels da capa aberta numa escala (px por mm). */
export function printSize(spec: PrintCoverSpec, pxPerMm: number): { width: number; height: number } {
  return { width: Math.round(spec.widthMm * pxPerMm), height: Math.round(spec.heightMm * pxPerMm) };
}

/**
 * Onde fica cada parte, em mm a partir da esquerda: orelha de trás, contracapa, lombada, frente e orelha da frente
 * (com a sangria por fora). Sem orelhas, a contracapa começa na sangria.
 */
export function printPanels(spec: PrintCoverSpec): { backStart: number; backEnd: number; spineEnd: number; frontEnd: number } {
  const backStart = spec.bleedMm + (spec.flapMm ?? 0);
  const backEnd = backStart + spec.trimWidthMm;
  const spineEnd = backEnd + spec.spineMm;
  return { backStart, backEnd, spineEnd, frontEnd: spineEnd + spec.trimWidthMm };
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
  options: {
    pxPerMm: number;
    guides: boolean;
    frontImage?: HTMLImageElement | null;
    /** Contracapa: a imagem de fundo, a foto de quem escreveu e o ISBN do impresso. */
    backImage?: HTMLImageElement | null;
    authorPhoto?: HTMLImageElement | null;
    isbn?: string | null;
  },
): void {
  const k = options.pxPerMm;
  const { width, height } = printSize(spec, k);
  const { backStart, backEnd, spineEnd, frontEnd } = printPanels(spec);
  const flap = spec.flapMm ?? 0;
  const family = fontFamily(design.font);
  const back = design.template === 'band' ? design.accentColor : design.backgroundColor;

  ctx.clearRect(0, 0, width, height);
  // Orelhas, contracapa e lombada: a cor de fundo (na Faixa, a cor da faixa, que segue da frente)
  ctx.fillStyle = back;
  ctx.fillRect(0, 0, width, height);
  // Contracapa com imagem de fundo (até a borda, com a sangria, ou até a dobra da orelha), escurecida para o texto
  const backX = flap ? Math.round(backStart * k) : 0;
  const backBox = { x: backX, y: 0, w: Math.round(backEnd * k) - backX, h: height };
  if (options.backImage) {
    coverImage(ctx, options.backImage, backBox);
    const shade = design.backShade ?? 0;
    if (shade > 0) {
      ctx.fillStyle = `rgba(0, 0, 0, ${shade / 100})`;
      ctx.fillRect(backBox.x, backBox.y, backBox.w, backBox.h);
    }
  }

  // Frente: do começo dela até a sangria da direita. Com a capa importada em PDF, a imagem dela (o servidor põe
  // o PDF original por cima, como vetor)
  const front = { x: spineEnd * k, y: 0, w: flap ? spec.trimWidthMm * k : width - spineEnd * k, h: height };
  if (options.frontImage) {
    coverImage(ctx, options.frontImage, front);
  } else {
    drawCover(ctx, design, image, front);
  }

  ctx.fillStyle = design.textColor;
  ctx.textBaseline = 'top';

  // Contracapa: o texto em cima; embaixo à direita fica livre para o código de barras
  const left = (backStart + SAFE_MM + 6) * k;
  const textWidth = (spec.trimWidthMm - 2 * SAFE_MM - 12) * k;
  const size = 4.2 * k;
  ctx.textAlign = 'left';
  ctx.font = `400 ${size}px ${family}`;
  let y = (spec.bleedMm + SAFE_MM + 14) * k;
  // Embaixo: foto e mini biografia à esquerda, código de barras à direita; o texto para antes. Com orelhas, a foto
  // e a biografia vão para a orelha de trás
  const photo = design.backPhoto ? (options.authorPhoto ?? null) : null;
  const bio = design.backBio?.trim() || null;
  if (flap && (photo || bio || design.author)) {
    drawFlap(ctx, { x: (spec.bleedMm + 6) * k, w: (flap - 12) * k, top: (spec.bleedMm + SAFE_MM + 14) * k,
      bottom: (spec.bleedMm + spec.trimHeightMm - SAFE_MM) * k }, family, design.textColor, k,
      { photo, author: design.author, text: bio });
  }
  if (flap && design.flapText?.trim()) {
    drawFlap(ctx, { x: (frontEnd + 6) * k, w: (flap - 12) * k, top: (spec.bleedMm + SAFE_MM + 14) * k,
      bottom: (spec.bleedMm + spec.trimHeightMm - SAFE_MM) * k }, family, design.textColor, k,
      { photo: null, author: null, text: design.flapText.trim() });
  }
  const barcode = design.barcode !== false && !!isbn13(options.isbn);
  const lower = (!flap && (!!photo || !!bio)) || barcode;
  const bottom = (spec.bleedMm + spec.trimHeightMm * (lower ? 0.6 : 0.7)) * k;
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
  const zoneTop = (spec.bleedMm + spec.trimHeightMm - SAFE_MM - 34) * k;
  const barW = 38 * k;
  const barH = 24 * k;
  const barX = (backEnd - SAFE_MM - 4) * k - barW;
  if (barcode && options.isbn) {
    drawBarcode(ctx, options.isbn, barX, (spec.bleedMm + spec.trimHeightMm - SAFE_MM - 4) * k - barH, barW, barH);
  }
  if (!flap && (photo || bio)) {
    // Foto redonda e, ao lado, o nome e a mini biografia
    let textX = left;
    if (photo) {
      const d = 24 * k;
      ctx.save();
      ctx.beginPath();
      ctx.arc(left + d / 2, zoneTop + d / 2, d / 2, 0, Math.PI * 2);
      ctx.clip();
      coverImage(ctx, photo, { x: left, y: zoneTop, w: d, h: d });
      ctx.restore();
      textX = left + d + 4 * k;
    }
    const bioWidth = (barcode ? barX - 4 * k : (backEnd - SAFE_MM - 6) * k) - textX;
    ctx.fillStyle = design.textColor;
    ctx.textAlign = 'left';
    let by = zoneTop;
    if (design.author) {
      ctx.font = `600 ${3.4 * k}px ${family}`;
      ctx.fillText(design.author, textX, by, bioWidth);
      by += 3.4 * k * 1.5;
    }
    if (bio) {
      const bioSize = 2.9 * k;
      ctx.font = `400 ${bioSize}px ${family}`;
      const limit = (spec.bleedMm + spec.trimHeightMm - SAFE_MM) * k;
      for (const line of wrapText((t) => ctx.measureText(t).width, bio, bioWidth)) {
        if (by + bioSize > limit) {
          break;
        }
        ctx.fillText(line, textX, by);
        by += bioSize * 1.4;
      }
    }
  } else if (design.author && !flap) {
    ctx.fillStyle = design.textColor;
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
    drawGuides(ctx, spec, k, { backStart, backEnd, spineEnd, frontEnd });
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
/** Uma orelha: a foto (redonda), o nome e o texto, de cima para baixo. */
function drawFlap(
  ctx: CanvasRenderingContext2D,
  area: { x: number; w: number; top: number; bottom: number },
  family: string,
  color: string,
  k: number,
  content: { photo: HTMLImageElement | null; author: string | null; text: string | null },
): void {
  ctx.save();
  ctx.fillStyle = color;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  let y = area.top;
  if (content.photo) {
    const d = Math.min(30 * k, area.w);
    ctx.save();
    ctx.beginPath();
    ctx.arc(area.x + d / 2, y + d / 2, d / 2, 0, Math.PI * 2);
    ctx.clip();
    coverImage(ctx, content.photo, { x: area.x, y, w: d, h: d });
    ctx.restore();
    y += d + 5 * k;
  }
  if (content.author) {
    ctx.font = `600 ${3.6 * k}px ${family}`;
    ctx.fillText(content.author, area.x, y, area.w);
    y += 3.6 * k * 1.6;
  }
  if (content.text) {
    const size = 3.3 * k;
    ctx.font = `400 ${size}px ${family}`;
    for (const paragraph of content.text.split('\n').filter((p) => p.trim())) {
      for (const line of wrapText((t) => ctx.measureText(t).width, paragraph.trim(), area.w)) {
        if (y + size > area.bottom) {
          ctx.restore();
          return;
        }
        ctx.fillText(line, area.x, y);
        y += size * 1.45;
      }
      y += size * 0.7;
    }
  }
  ctx.restore();
}

function drawGuides(ctx: CanvasRenderingContext2D, spec: PrintCoverSpec, k: number, panels: { backStart: number; backEnd: number; spineEnd: number; frontEnd: number }): void {
  const { width, height } = printSize(spec, k);
  ctx.save();
  ctx.setLineDash([2 * k, 1.5 * k]);
  ctx.lineWidth = Math.max(1, 0.35 * k);
  ctx.strokeStyle = 'rgba(255, 64, 64, 0.9)';
  ctx.strokeRect(spec.bleedMm * k, spec.bleedMm * k, width - 2 * spec.bleedMm * k, height - 2 * spec.bleedMm * k);
  ctx.strokeStyle = 'rgba(64, 160, 255, 0.9)';
  // Dobras da lombada e, com orelhas, das orelhas
  const folds = spec.flapMm ? [panels.backStart, panels.backEnd, panels.spineEnd, panels.frontEnd] : [panels.backEnd, panels.spineEnd];
  for (const x of folds) {
    ctx.beginPath();
    ctx.moveTo(x * k, 0);
    ctx.lineTo(x * k, height);
    ctx.stroke();
  }
  ctx.restore();
}
