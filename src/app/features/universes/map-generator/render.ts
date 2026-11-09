import { perlin } from './noise';
import { fork, seededRandom } from './random';
import { Biome, FeatureKind, MapStyle, World } from './world';

/** Tamanho da imagem final (4:3), igual para todos os tamanhos de mundo. */
export const OUTPUT_WIDTH = 1600;
export const OUTPUT_HEIGHT = 1200;

type Rgb = [number, number, number];

interface Palette {
  biome: Record<Biome, Rgb>;
  deepSea: Rgb;
  shallowSea: Rgb;
  coast: Rgb;
  border: Rgb;
  river: string;
  ink: string;
  halo: string;
  countryTint: number;
  paper: boolean;
}

const ATLAS: Palette = {
  biome: {
    [Biome.DeepSea]: [43, 74, 107],
    [Biome.Sea]: [61, 102, 136],
    [Biome.Lake]: [79, 126, 163],
    [Biome.Snow]: [238, 240, 242],
    [Biome.Tundra]: [169, 179, 154],
    [Biome.Taiga]: [79, 107, 74],
    [Biome.Grassland]: [156, 179, 107],
    [Biome.Forest]: [95, 138, 74],
    [Biome.Rainforest]: [63, 110, 58],
    [Biome.Desert]: [217, 195, 138],
    [Biome.Savanna]: [196, 181, 107],
    [Biome.Swamp]: [107, 122, 85],
    [Biome.Mountain]: [138, 127, 114],
  },
  deepSea: [36, 63, 94],
  shallowSea: [92, 138, 172],
  coast: [40, 44, 40],
  border: [120, 40, 32],
  river: 'rgba(70, 120, 170, 0.95)',
  ink: '#1d1d1b',
  halo: 'rgba(250, 247, 238, 0.85)',
  countryTint: 0.16,
  paper: false,
};

const PARCHMENT: Palette = {
  biome: {
    [Biome.DeepSea]: [176, 160, 125],
    [Biome.Sea]: [196, 182, 146],
    [Biome.Lake]: [184, 170, 136],
    [Biome.Snow]: [245, 236, 214],
    [Biome.Tundra]: [222, 207, 172],
    [Biome.Taiga]: [176, 168, 120],
    [Biome.Grassland]: [230, 214, 168],
    [Biome.Forest]: [190, 180, 128],
    [Biome.Rainforest]: [172, 164, 112],
    [Biome.Desert]: [240, 222, 176],
    [Biome.Savanna]: [232, 212, 160],
    [Biome.Swamp]: [186, 176, 136],
    [Biome.Mountain]: [196, 172, 132],
  },
  deepSea: [168, 150, 114],
  shallowSea: [206, 192, 156],
  coast: [74, 52, 30],
  border: [110, 50, 30],
  river: 'rgba(96, 74, 52, 0.85)',
  ink: '#3b2a18',
  halo: 'rgba(240, 226, 192, 0.85)',
  countryTint: 0.1,
  paper: true,
};

export function paletteOf(style: MapStyle): Palette {
  return style === 'parchment' ? PARCHMENT : ATLAS;
}

/** Desenha o mundo no canvas: terreno com sombra de relevo, fronteiras, rios, símbolos, cidades e nomes. */
export function renderWorld(canvas: HTMLCanvasElement, world: World, title: string): void {
  canvas.width = OUTPUT_WIDTH;
  canvas.height = OUTPUT_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return;
  }
  const palette = paletteOf(world.settings.style);
  ctx.putImageData(terrain(ctx, world, palette), 0, 0);
  const sx = (OUTPUT_WIDTH - 1) / (world.width - 1);
  const sy = (OUTPUT_HEIGHT - 1) / (world.height - 1);
  const symbols = fork(world.settings.seed, 'simbolos');
  drawSymbols(ctx, world, palette, sx, sy, symbols);
  drawRivers(ctx, world, palette, sx, sy);
  const labels = new Labels();
  drawSettlements(ctx, world, palette, sx, sy, labels);
  drawCountryNames(ctx, world, sx, sy, labels);
  drawFeatures(ctx, world, palette, sx, sy, labels);
  drawCompass(ctx, palette);
  drawTitle(ctx, palette, title);
  drawFrame(ctx, palette);
}

// ===== Terreno (pixel a pixel) =====

function terrain(ctx: CanvasRenderingContext2D, world: World, palette: Palette): ImageData {
  const { width: W, height: H, elevation, seaLevel, minElevation, biome, lake, country } = world;
  const image = ctx.createImageData(OUTPUT_WIDTH, OUTPUT_HEIGHT);
  const data = image.data;
  const total = OUTPUT_WIDTH * OUTPUT_HEIGHT;
  const isWater = new Uint8Array(total);
  const owner = new Int16Array(total);
  const jitter = perlin(seededRandom(`${world.settings.seed}/fronteiras`));
  const paper = perlin(seededRandom(`${world.settings.seed}/papel`));
  const tints = world.countries.map((c) => hexToRgb(c.color));

  // Sombra de relevo por célula (luz vindo do noroeste)
  const shade = new Float32Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const e = (dx: number, dy: number) =>
        elevation[Math.min(H - 1, Math.max(0, y + dy)) * W + Math.min(W - 1, Math.max(0, x + dx))];
      const slope = e(-1, 0) - e(1, 0) + e(0, -1) - e(0, 1);
      shade[y * W + x] = Math.min(1.25, Math.max(0.72, 1 + slope * 5));
    }
  }

  const sx = (W - 1) / (OUTPUT_WIDTH - 1);
  const sy = (H - 1) / (OUTPUT_HEIGHT - 1);
  for (let py = 0; py < OUTPUT_HEIGHT; py++) {
    const gy = py * sy;
    const y0 = Math.floor(gy);
    const y1 = Math.min(H - 1, y0 + 1);
    const fy = gy - y0;
    for (let px = 0; px < OUTPUT_WIDTH; px++) {
      const gx = px * sx;
      const x0 = Math.floor(gx);
      const x1 = Math.min(W - 1, x0 + 1);
      const fx = gx - x0;
      const i00 = y0 * W + x0;
      const i10 = y0 * W + x1;
      const i01 = y1 * W + x0;
      const i11 = y1 * W + x1;
      const w00 = (1 - fx) * (1 - fy);
      const w10 = fx * (1 - fy);
      const w01 = (1 - fx) * fy;
      const w11 = fx * fy;
      const e = elevation[i00] * w00 + elevation[i10] * w10 + elevation[i01] * w01 + elevation[i11] * w11;
      const p = py * OUTPUT_WIDTH + px;
      let rgb: Rgb;
      if (e < seaLevel) {
        isWater[p] = 1;
        owner[p] = -1;
        const nearest = fy < 0.5 ? (fx < 0.5 ? i00 : i10) : fx < 0.5 ? i01 : i11;
        if (lake[nearest]) {
          rgb = palette.biome[Biome.Lake];
        } else {
          const depth = Math.min(1, Math.max(0, (seaLevel - e) / (seaLevel - minElevation)));
          rgb = mix(palette.shallowSea, palette.deepSea, Math.pow(depth, 0.55));
        }
      } else {
        // Cor da terra: mistura suave dos biomas vizinhos (só células de terra)
        const cells = [i00, i10, i01, i11];
        const weights = [w00, w10, w01, w11];
        let r = 0;
        let g = 0;
        let b = 0;
        let sum = 0;
        let s = 0;
        for (let k = 0; k < 4; k++) {
          if (!world.water[cells[k]]) {
            const c = palette.biome[biome[cells[k]] as Biome];
            r += c[0] * weights[k];
            g += c[1] * weights[k];
            b += c[2] * weights[k];
            s += shade[cells[k]] * weights[k];
            sum += weights[k];
          }
        }
        if (sum === 0) {
          rgb = palette.biome[Biome.Grassland];
          s = 1;
        } else {
          rgb = [r / sum, g / sum, b / sum];
          s /= sum;
        }
        rgb = [rgb[0] * s, rgb[1] * s, rgb[2] * s];
        // País: célula mais próxima, com um leve desvio para a fronteira não sair em degraus
        const jx = jitter(gx * 0.3, gy * 0.3) * 0.9;
        const jy = jitter(gx * 0.3 + 40, gy * 0.3 + 40) * 0.9;
        const cx = Math.min(W - 1, Math.max(0, Math.round(gx + jx)));
        const cy = Math.min(H - 1, Math.max(0, Math.round(gy + jy)));
        let id = country[cy * W + cx];
        if (id < 0) {
          id = country[Math.round(gy) * W + Math.round(gx)];
        }
        owner[p] = id;
        if (id >= 0 && palette.countryTint > 0) {
          rgb = mix(rgb, tints[id], palette.countryTint);
        }
      }
      if (palette.paper) {
        const grain = paper(px * 0.05, py * 0.05) * 10 + paper(px * 0.6, py * 0.6) * 5;
        rgb = [rgb[0] + grain, rgb[1] + grain, rgb[2] + grain * 0.8];
      }
      data[p * 4] = rgb[0];
      data[p * 4 + 1] = rgb[1];
      data[p * 4 + 2] = rgb[2];
      data[p * 4 + 3] = 255;
    }
  }

  // Costa e fronteiras
  for (let py = 1; py < OUTPUT_HEIGHT - 1; py++) {
    for (let px = 1; px < OUTPUT_WIDTH - 1; px++) {
      const p = py * OUTPUT_WIDTH + px;
      const right = p + 1;
      const below = p + OUTPUT_WIDTH;
      const left = p - 1;
      const above = p - OUTPUT_WIDTH;
      if (!isWater[p] && (isWater[right] || isWater[below] || isWater[left] || isWater[above])) {
        paint(data, p, palette.coast, 0.85);
      } else if (isWater[p] && (!isWater[right] || !isWater[below] || !isWater[left] || !isWater[above])) {
        paint(data, p, [255, 255, 255], 0.22);
      } else if (!isWater[p] && ((owner[right] >= 0 && owner[right] !== owner[p]) || (owner[below] >= 0 && owner[below] !== owner[p]))) {
        // tracejado
        if ((px + py) % 9 < 6) {
          paint(data, p, palette.border, 0.75);
          paint(data, right, palette.border, 0.35);
        }
      }
    }
  }
  return image;
}

// ===== Rios =====

function drawRivers(ctx: CanvasRenderingContext2D, world: World, palette: Palette, sx: number, sy: number): void {
  ctx.save();
  ctx.strokeStyle = palette.river;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const river of world.rivers) {
    const pts = river.points.map(([x, y]) => [x * sx, y * sy] as const);
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = i === 1 ? pts[0] : mid(pts[i - 2], pts[i - 1]);
      const [bx, by] = mid(pts[i - 1], pts[i]);
      ctx.lineWidth = 1 + river.widths[i] * 5;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.quadraticCurveTo(pts[i - 1][0], pts[i - 1][1], bx, by);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function mid(a: readonly [number, number], b: readonly [number, number]): [number, number] {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}

// ===== Símbolos de montanha e árvore =====

function drawSymbols(
  ctx: CanvasRenderingContext2D,
  world: World,
  palette: Palette,
  sx: number,
  sy: number,
  random: () => number,
): void {
  const { width: W, height: H, biome } = world;
  const step = Math.max(3, Math.round(W / 60));
  ctx.save();
  ctx.lineJoin = 'round';
  for (let y = 1; y < H - 1; y += step) {
    for (let x = 1; x < W - 1; x += step) {
      const cx = Math.min(W - 1, x + Math.floor(random() * step));
      const cy = Math.min(H - 1, y + Math.floor(random() * step));
      const b = biome[cy * W + cx] as Biome;
      const px = cx * sx;
      const py = cy * sy;
      if (b === Biome.Mountain || b === Biome.Snow) {
        mountain(ctx, px, py, 9 + random() * 6, b === Biome.Snow, palette);
      } else if ((b === Biome.Forest || b === Biome.Rainforest || b === Biome.Taiga) && random() < 0.75) {
        tree(ctx, px, py, 5 + random() * 2, b === Biome.Taiga, palette);
      }
    }
  }
  ctx.restore();
}

function mountain(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, snow: boolean, palette: Palette): void {
  ctx.beginPath();
  ctx.moveTo(x - size, y + size * 0.6);
  ctx.lineTo(x, y - size);
  ctx.lineTo(x + size, y + size * 0.6);
  ctx.fillStyle = palette.paper ? 'rgba(160, 130, 92, 0.55)' : 'rgba(120, 108, 96, 0.55)';
  ctx.fill();
  ctx.strokeStyle = palette.paper ? 'rgba(74, 52, 30, 0.8)' : 'rgba(50, 44, 38, 0.75)';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  if (snow) {
    ctx.beginPath();
    ctx.moveTo(x - size * 0.35, y - size * 0.3);
    ctx.lineTo(x, y - size);
    ctx.lineTo(x + size * 0.35, y - size * 0.3);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fill();
  }
}

function tree(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, conifer: boolean, palette: Palette): void {
  ctx.fillStyle = palette.paper ? 'rgba(96, 92, 52, 0.55)' : 'rgba(40, 72, 36, 0.5)';
  ctx.beginPath();
  if (conifer) {
    ctx.moveTo(x, y - size * 1.4);
    ctx.lineTo(x + size * 0.8, y + size * 0.5);
    ctx.lineTo(x - size * 0.8, y + size * 0.5);
    ctx.closePath();
  } else {
    ctx.arc(x, y - size * 0.4, size * 0.85, 0, Math.PI * 2);
  }
  ctx.fill();
}

// ===== Cidades e nomes =====

/** Retângulos já ocupados por textos e ícones: nomes não se sobrepõem. */
class Labels {
  private readonly boxes: [number, number, number, number][] = [];

  fits(x: number, y: number, w: number, h: number): boolean {
    if (x < 24 || y < 24 || x + w > OUTPUT_WIDTH - 24 || y + h > OUTPUT_HEIGHT - 24) {
      return false;
    }
    return this.boxes.every(([bx, by, bw, bh]) => x + w < bx || bx + bw < x || y + h < by || by + bh < y);
  }

  take(x: number, y: number, w: number, h: number): void {
    this.boxes.push([x, y, w, h]);
  }
}

const FONT = 'Literata, Georgia, serif';

function drawSettlements(
  ctx: CanvasRenderingContext2D,
  world: World,
  palette: Palette,
  sx: number,
  sy: number,
  labels: Labels,
): void {
  const order = { capital: 0, city: 1, village: 2 } as const;
  const sorted = [...world.settlements].sort((a, b) => order[a.kind] - order[b.kind]);
  for (const s of sorted) {
    const x = s.x * sx;
    const y = s.y * sy;
    const radius = s.kind === 'capital' ? 7 : s.kind === 'city' ? 5 : 3;
    labels.take(x - radius - 2, y - radius - 2, radius * 2 + 4, radius * 2 + 4);
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = s.kind === 'village' ? palette.ink : '#ffffff';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = palette.ink;
    ctx.stroke();
    if (s.kind === 'capital') {
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = palette.ink;
      ctx.fill();
    } else if (s.kind === 'city') {
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fillStyle = palette.ink;
      ctx.fill();
    }
    ctx.restore();

    const size = s.kind === 'capital' ? 22 : s.kind === 'city' ? 18 : 14;
    const weight = s.kind === 'capital' ? '700' : s.kind === 'city' ? '600' : '400';
    ctx.font = `${weight} ${size}px ${FONT}`;
    const w = ctx.measureText(s.name).width;
    const candidates: [number, number][] = [
      [x + radius + 5, y - size / 2],
      [x - radius - 5 - w, y - size / 2],
      [x - w / 2, y - radius - 4 - size],
      [x - w / 2, y + radius + 4],
    ];
    const spot = candidates.find(([lx, ly]) => labels.fits(lx, ly, w, size));
    if (!spot) {
      continue;
    }
    labels.take(spot[0], spot[1], w, size);
    text(ctx, s.name, spot[0], spot[1] + size * 0.82, palette.ink, palette.halo);
  }
}

function drawCountryNames(ctx: CanvasRenderingContext2D, world: World, sx: number, sy: number, labels: Labels): void {
  for (const c of world.countries) {
    const size = Math.max(20, Math.min(34, 14 + Math.sqrt(c.area) * 0.35));
    ctx.save();
    ctx.font = `600 ${size}px ${FONT}`;
    ctx.letterSpacing = `${Math.round(size * 0.3)}px`;
    const name = c.name.toUpperCase();
    const w = ctx.measureText(name).width;
    let x = c.label[0] * sx - w / 2;
    let y = c.label[1] * sy - size / 2;
    for (const dy of [0, size * 1.4, -size * 1.4, size * 2.6, -size * 2.6]) {
      if (labels.fits(x, y + dy, w, size)) {
        y += dy;
        break;
      }
    }
    x = Math.min(OUTPUT_WIDTH - 30 - w, Math.max(30, x));
    labels.take(x, y, w, size);
    ctx.globalAlpha = 0.78;
    text(ctx, name, x, y + size * 0.82, darken(c.color, 0.45), 'rgba(255, 255, 255, 0.55)');
    ctx.restore();
  }
}

const FEATURE_COLOR: Record<FeatureKind, string> = {
  forest: '#2e4a24',
  jungle: '#24401f',
  mountains: '#4a3a2a',
  desert: '#6b5426',
  swamp: '#3a4426',
  sea: '#e8eef4',
  lake: '#1f3b57',
};

function drawFeatures(
  ctx: CanvasRenderingContext2D,
  world: World,
  palette: Palette,
  sx: number,
  sy: number,
  labels: Labels,
): void {
  for (const f of world.features) {
    const sea = f.kind === 'sea';
    const size = sea ? 26 : 16;
    ctx.save();
    ctx.font = `italic ${sea ? 500 : 600} ${size}px ${FONT}`;
    if (sea) {
      ctx.letterSpacing = '4px';
    }
    const w = ctx.measureText(f.name).width;
    const x = f.x * sx - w / 2;
    const y = f.y * sy - size / 2;
    const spot = [0, size * 1.3, -size * 1.3, size * 2.4].map((dy) => [x, y + dy] as const).find(([lx, ly]) => labels.fits(lx, ly, w, size));
    if (spot) {
      labels.take(spot[0], spot[1], w, size);
      const color = palette.paper ? (sea ? '#5a4128' : '#4a3422') : FEATURE_COLOR[f.kind];
      text(ctx, f.name, spot[0], spot[1] + size * 0.82, color, sea ? 'transparent' : palette.halo);
    }
    ctx.restore();
  }
}

function text(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, fill: string, halo: string): void {
  ctx.lineJoin = 'round';
  if (halo !== 'transparent') {
    ctx.lineWidth = 4;
    ctx.strokeStyle = halo;
    ctx.strokeText(value, x, y);
  }
  ctx.fillStyle = fill;
  ctx.fillText(value, x, y);
}

// ===== Moldura, rosa dos ventos e título =====

function drawCompass(ctx: CanvasRenderingContext2D, palette: Palette): void {
  const x = OUTPUT_WIDTH - 110;
  const y = OUTPUT_HEIGHT - 120;
  const r = 44;
  ctx.save();
  ctx.translate(x, y);
  for (let k = 0; k < 4; k++) {
    ctx.rotate(Math.PI / 2);
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.lineTo(8, 0);
    ctx.lineTo(-8, 0);
    ctx.closePath();
    ctx.fillStyle = k % 2 === 0 ? palette.ink : 'rgba(255, 255, 255, 0.85)';
    ctx.fill();
    ctx.strokeStyle = palette.ink;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.62, 0, Math.PI * 2);
  ctx.strokeStyle = palette.ink;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.font = `700 18px ${FONT}`;
  ctx.textAlign = 'center';
  text(ctx, 'N', 0, -r - 8, palette.ink, palette.halo);
  ctx.restore();
}

function drawTitle(ctx: CanvasRenderingContext2D, palette: Palette, title: string): void {
  if (!title.trim()) {
    return;
  }
  ctx.save();
  ctx.font = `700 34px ${FONT}`;
  const w = ctx.measureText(title).width;
  const x = 48;
  const y = 44;
  ctx.fillStyle = palette.paper ? 'rgba(240, 226, 192, 0.92)' : 'rgba(250, 247, 238, 0.9)';
  ctx.strokeStyle = palette.ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, w + 48, 60, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = palette.ink;
  ctx.fillText(title, x + 24, y + 42);
  ctx.restore();
}

function drawFrame(ctx: CanvasRenderingContext2D, palette: Palette): void {
  ctx.save();
  ctx.strokeStyle = palette.ink;
  ctx.lineWidth = 6;
  ctx.strokeRect(6, 6, OUTPUT_WIDTH - 12, OUTPUT_HEIGHT - 12);
  ctx.lineWidth = 1.5;
  ctx.strokeRect(16, 16, OUTPUT_WIDTH - 32, OUTPUT_HEIGHT - 32);
  ctx.restore();
}

// ===== Cores =====

function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function paint(data: Uint8ClampedArray, p: number, rgb: Rgb, alpha: number): void {
  data[p * 4] = data[p * 4] * (1 - alpha) + rgb[0] * alpha;
  data[p * 4 + 1] = data[p * 4 + 1] * (1 - alpha) + rgb[1] * alpha;
  data[p * 4 + 2] = data[p * 4 + 2] * (1 - alpha) + rgb[2] * alpha;
}

export function hexToRgb(hex: string): Rgb {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function darken(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex).map((v) => Math.round(v * (1 - amount)));
  return `rgb(${r}, ${g}, ${b})`;
}
