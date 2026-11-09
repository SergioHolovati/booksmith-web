import { CULTURES, Culture, NameMaker } from './names';
import { fbm, perlin } from './noise';
import { Random, fork, pick } from './random';

/**
 * Gerador de continente, sem IA (geração procedural, como nos jogos de estratégia). Tudo sai da semente: a
 * mesma semente com os mesmos ajustes gera sempre o mesmo mundo. Etapas:
 * 1. relevo (ruído em camadas + máscara de continente) e nível do mar pela quantidade de terra pedida;
 * 2. clima: temperatura pela latitude e altitude; umidade pelo ruído e pela distância do mar;
 * 3. biomas (floresta, deserto, tundra…) pela altura, temperatura e umidade;
 * 4. drenagem ("priority flood") e acúmulo de chuva: rios descem das serras até o mar;
 * 5. países crescem a partir das capitais, com montanhas e rios como fronteiras naturais;
 * 6. cidades e vilarejos nos lugares bons (costa, beira de rio, clima ameno); nomes com sotaque por país.
 *
 * Mudar este algoritmo muda o mapa de sementes antigas: nesse caso, suba {@link GENERATOR_VERSION}.
 */
export const GENERATOR_VERSION = 1;

export type MapSize = 'small' | 'medium' | 'large';
export type LandAmount = 'little' | 'medium' | 'much';
export type Climate = 'cold' | 'temperate' | 'hot' | 'varied';
export type MapStyle = 'atlas' | 'parchment';

/** Os mesmos ajustes que a API guarda (`MapGeneratorSettings`). */
export interface MapSettings {
  version: number;
  seed: string;
  size: MapSize;
  land: LandAmount;
  countries: number;
  climate: Climate;
  style: MapStyle;
}

export function defaultSettings(seed: string): MapSettings {
  return { version: GENERATOR_VERSION, seed, size: 'medium', land: 'medium', countries: 4, climate: 'varied', style: 'atlas' };
}

export enum Biome {
  DeepSea,
  Sea,
  Lake,
  Snow,
  Tundra,
  Taiga,
  Grassland,
  Forest,
  Rainforest,
  Desert,
  Savanna,
  Swamp,
  Mountain,
}

export interface Country {
  id: number;
  name: string;
  culture: string;
  capital: number;
  color: string;
  area: number;
  /** Onde escrever o nome: o ponto mais longe das fronteiras. */
  label: [number, number];
}

export type SettlementKind = 'capital' | 'city' | 'village';

export interface Settlement {
  name: string;
  kind: SettlementKind;
  country: number;
  x: number;
  y: number;
}

export type FeatureKind = 'forest' | 'jungle' | 'mountains' | 'desert' | 'swamp' | 'sea' | 'lake';

export interface Feature {
  name: string;
  kind: FeatureKind;
  x: number;
  y: number;
  size: number;
}

export interface River {
  /** Pontos em coordenadas da grade (centro das células), da nascente à foz. */
  points: [number, number][];
  /** Largura relativa (0–1) em cada ponto, pelo volume de água. */
  widths: number[];
}

export interface World {
  settings: MapSettings;
  width: number;
  height: number;
  elevation: Float32Array;
  seaLevel: number;
  minElevation: number;
  water: Uint8Array;
  lake: Uint8Array;
  biome: Uint8Array;
  country: Int16Array;
  rivers: River[];
  countries: Country[];
  settlements: Settlement[];
  features: Feature[];
}

const GRID: Record<MapSize, [number, number]> = { small: [160, 120], medium: [216, 162], large: [280, 210] };
const LAND: Record<LandAmount, number> = { little: 0.3, medium: 0.42, much: 0.55 };
const CITIES: Record<MapSize, number> = { small: 1, medium: 2, large: 3 };
const VILLAGES: Record<MapSize, number> = { small: 2, medium: 3, large: 5 };

export const COUNTRY_COLORS = [
  '#c2604a', '#4a7fc2', '#d1a43c', '#6aa35a', '#9b5fb0', '#3fa3a0',
  '#c97a3a', '#7d8f3a', '#b04a72', '#5a6bb0', '#a3784a', '#4aa36e',
];

const NEIGHBORS: [number, number, number][] = [
  [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
  [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2],
];

export function generateWorld(settings: MapSettings): World {
  const [W, H] = GRID[settings.size];
  const N = W * H;
  const seed = `${settings.seed}/v${settings.version}`;

  // ===== 1. Relevo =====
  const relief = perlin(fork(seed, 'relevo'));
  const shape = perlin(fork(seed, 'forma'));
  const elevation = new Float32Array(N);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const nx = x / (W - 1);
      const ny = y / (H - 1);
      const dx = (nx - 0.5) * 2;
      const dy = (ny - 0.5) * 2;
      const warp = fbm(shape, nx * 2.2, ny * 2.2, 3) * 0.55;
      const mask = 1 - (Math.sqrt(dx * dx * 0.85 + dy * dy * 1.1) + warp);
      const detail = fbm(relief, (x / W) * 4.5, (y / W) * 4.5, 5);
      let e = 0.6 * mask + 0.4 * detail;
      const border = Math.min(nx, 1 - nx, ny, 1 - ny);
      if (border < 0.07) {
        e -= (0.07 - border) * 8;
      }
      elevation[y * W + x] = e;
    }
  }
  const seaLevel = quantile(elevation, 1 - LAND[settings.land]);
  let minElevation = Infinity;
  let maxElevation = -Infinity;
  for (const e of elevation) {
    minElevation = Math.min(minElevation, e);
    maxElevation = Math.max(maxElevation, e);
  }
  const water = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    water[i] = elevation[i] < seaLevel ? 1 : 0;
  }

  // Oceano: água ligada à borda; o resto da água é lago
  const ocean = new Uint8Array(N);
  const queue: number[] = [];
  for (let i = 0; i < N; i++) {
    const x = i % W;
    const y = (i - x) / W;
    if (water[i] && (x === 0 || y === 0 || x === W - 1 || y === H - 1)) {
      ocean[i] = 1;
      queue.push(i);
    }
  }
  for (let q = 0; q < queue.length; q++) {
    forNeighbors4(queue[q], W, H, (n) => {
      if (water[n] && !ocean[n]) {
        ocean[n] = 1;
        queue.push(n);
      }
    });
  }
  const lake = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    lake[i] = water[i] && !ocean[i] ? 1 : 0;
  }

  // Altura da terra em [0, 1] acima do mar
  const height = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    height[i] = water[i] ? 0 : (elevation[i] - seaLevel) / Math.max(1e-6, maxElevation - seaLevel);
  }
  const distOcean = bfsDistance(N, W, H, (i) => ocean[i] === 1);

  // ===== 2. Clima =====
  const tempNoise = perlin(fork(seed, 'temperatura'));
  const moistNoise = perlin(fork(seed, 'umidade'));
  const temperature = new Float32Array(N);
  const moisture = new Float32Array(N);
  for (let y = 0; y < H; y++) {
    const ny = y / (H - 1);
    const base = latitudeTemperature(settings.climate, ny);
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      temperature[i] = clamp01(base + 0.12 * fbm(tempNoise, (x / W) * 3, (y / W) * 3, 3) - 0.45 * height[i]);
      const coast = Math.exp(-distOcean[i] / (W * 0.09));
      moisture[i] = clamp01(0.42 + 0.4 * fbm(moistNoise, (x / W) * 3.5, (y / W) * 3.5, 4) + 0.35 * coast - 0.12);
    }
  }

  // ===== 3. Biomas =====
  const landHeights = Float32Array.from(height.filter((_, i) => !water[i]));
  const mountainLine = quantile(landHeights, 0.86);
  const snowLine = quantile(landHeights, 0.96);
  const biome = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    if (water[i]) {
      biome[i] = lake[i] ? Biome.Lake : elevation[i] < seaLevel - (seaLevel - minElevation) * 0.35 ? Biome.DeepSea : Biome.Sea;
    } else {
      biome[i] = landBiome(height[i], temperature[i], moisture[i], mountainLine, snowLine);
    }
  }

  // ===== 4. Rios: drenagem até o mar e acúmulo de chuva =====
  const { down, order } = drainage(elevation, ocean, W, H);
  const flow = new Float32Array(N);
  for (const i of order) {
    if (!water[i]) {
      flow[i] += 0.2 + moisture[i];
      if (down[i] >= 0) {
        flow[down[i]] += flow[i];
      }
    }
  }
  const landFlows = Float32Array.from(flow.filter((_, i) => !water[i]));
  const riverLine = Math.max(8, quantile(landFlows, 0.965));
  const river = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    river[i] = !water[i] && flow[i] >= riverLine ? 1 : 0;
  }
  const rivers = traceRivers(river, down, water, flow, W);

  // ===== 5. Países =====
  const random = fork(seed, 'paises');
  const habitability = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    if (water[i] || biome[i] === Biome.Mountain || biome[i] === Biome.Snow) {
      habitability[i] = -Infinity;
      continue;
    }
    let s = 1 - Math.abs(temperature[i] - 0.5) * 1.2 - height[i] * 0.8;
    if (river[i] || neighborIs(i, W, H, river)) {
      s += 0.5;
    }
    if (distOcean[i] <= 2) {
      s += 0.4;
    }
    if (biome[i] === Biome.Desert) {
      s -= 0.6;
    }
    if (biome[i] === Biome.Swamp || biome[i] === Biome.Tundra) {
      s -= 0.4;
    }
    habitability[i] = s;
  }
  const landCount = landHeights.length;
  const capitals = spreadOut(habitability, random, settings.countries, Math.sqrt(landCount / settings.countries) * 0.75, W);
  const country = growCountries(capitals, water, biome, river, height, W, H);

  const nameRandom = fork(seed, 'nomes');
  const names = new NameMaker(nameRandom);
  const countries: Country[] = capitals.map((capital, id) => {
    const culture = pick(nameRandom, CULTURES);
    return { id, name: names.name(culture), culture: culture.key, capital, color: COUNTRY_COLORS[id % COUNTRY_COLORS.length], area: 0, label: [0, 0] };
  });
  for (let i = 0; i < N; i++) {
    if (country[i] >= 0) {
      countries[country[i]].area++;
    }
  }
  for (const c of countries) {
    c.label = regionCenter(country, c.id, W, H);
  }

  // ===== 6. Cidades e vilarejos =====
  const settlements: Settlement[] = [];
  const placed: number[] = [];
  const cultureOf = (c: Country) => CULTURES.find((k) => k.key === c.culture) ?? CULTURES[0];
  for (const c of countries) {
    settlements.push(cell(c.capital, W, { name: names.name(cultureOf(c)), kind: 'capital', country: c.id }));
    placed.push(c.capital);
  }
  const settleRandom = fork(seed, 'cidades');
  for (const [kind, perCountry, spacing] of [
    ['city', CITIES[settings.size], 0.065],
    ['village', VILLAGES[settings.size], 0.04],
  ] as const) {
    for (const c of countries) {
      const candidates: number[] = [];
      for (let i = 0; i < N; i++) {
        if (country[i] === c.id && habitability[i] > -Infinity) {
          candidates.push(i);
        }
      }
      const score = new Map(candidates.map((i) => [i, habitability[i] + settleRandom() * 0.5]));
      candidates.sort((a, b) => (score.get(b) ?? 0) - (score.get(a) ?? 0));
      let count = 0;
      for (const i of candidates) {
        if (count >= perCountry) {
          break;
        }
        if (placed.every((p) => distance(p, i, W) >= W * spacing)) {
          placed.push(i);
          settlements.push(cell(i, W, { name: names.name(cultureOf(c)), kind, country: c.id }));
          count++;
        }
      }
    }
  }

  // ===== Acidentes geográficos com nome =====
  const features = nameFeatures(biome, ocean, lake, country, countries, names, fork(seed, 'lugares'), W, H);

  return {
    settings,
    width: W,
    height: H,
    elevation,
    seaLevel,
    minElevation,
    water,
    lake,
    biome,
    country,
    rivers,
    countries,
    settlements,
    features,
  };
}

// ===== Clima e biomas =====

function latitudeTemperature(climate: Climate, ny: number): number {
  switch (climate) {
    case 'cold':
      return 0.05 + 0.35 * ny;
    case 'temperate':
      return 0.35 + 0.3 * ny;
    case 'hot':
      return 0.6 + 0.35 * ny;
    default:
      return 0.12 + 0.78 * ny;
  }
}

function landBiome(h: number, temp: number, moist: number, mountainLine: number, snowLine: number): Biome {
  if (h >= snowLine || (h >= mountainLine && temp < 0.3)) {
    return Biome.Snow;
  }
  if (h >= mountainLine) {
    return Biome.Mountain;
  }
  if (temp < 0.2) {
    return Biome.Tundra;
  }
  if (temp < 0.36) {
    return moist > 0.42 ? Biome.Taiga : Biome.Tundra;
  }
  if (temp > 0.7) {
    if (moist < 0.32) {
      return Biome.Desert;
    }
    return moist < 0.55 ? Biome.Savanna : Biome.Rainforest;
  }
  if (moist < 0.26) {
    return temp > 0.55 ? Biome.Desert : Biome.Grassland;
  }
  if (moist > 0.74 && h < 0.12) {
    return Biome.Swamp;
  }
  return moist < 0.5 ? Biome.Grassland : Biome.Forest;
}

// ===== Drenagem =====

/**
 * "Priority flood": a água sai do oceano e sobe pelo terreno; cada célula aponta para onde a água dela desce.
 * Buracos são preenchidos, então todo rio chega ao mar. `order` vai do mais alto ao mais baixo.
 */
function drainage(elevation: Float32Array, ocean: Uint8Array, W: number, H: number): { down: Int32Array; order: number[] } {
  const N = W * H;
  const down = new Int32Array(N).fill(-1);
  const filled = new Float32Array(N);
  const visited = new Uint8Array(N);
  const heap = new MinHeap(N);
  for (let i = 0; i < N; i++) {
    if (ocean[i]) {
      visited[i] = 1;
      filled[i] = elevation[i];
      heap.push(i, elevation[i]);
    }
  }
  const order: number[] = [];
  while (heap.size > 0) {
    const c = heap.pop();
    if (!ocean[c]) {
      order.push(c);
    }
    forNeighbors8(c, W, H, (n) => {
      if (!visited[n]) {
        visited[n] = 1;
        filled[n] = Math.max(elevation[n], filled[c] + 1e-5);
        down[n] = c;
        heap.push(n, filled[n]);
      }
    });
  }
  order.reverse();
  return { down, order };
}

function traceRivers(river: Uint8Array, down: Int32Array, water: Uint8Array, flow: Float32Array, W: number): River[] {
  const N = river.length;
  const hasUpstream = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    if (river[i] && down[i] >= 0) {
      hasUpstream[down[i]] = 1;
    }
  }
  let maxFlow = 1;
  for (let i = 0; i < N; i++) {
    if (river[i]) {
      maxFlow = Math.max(maxFlow, flow[i]);
    }
  }
  const drawn = new Uint8Array(N);
  const heads: number[] = [];
  for (let i = 0; i < N; i++) {
    if (river[i] && !hasUpstream[i]) {
      heads.push(i);
    }
  }
  heads.sort((a, b) => flow[b] - flow[a] || a - b);
  const rivers: River[] = [];
  for (const head of heads) {
    const points: [number, number][] = [];
    const widths: number[] = [];
    let c = head;
    while (c >= 0) {
      const x = c % W;
      points.push([x, (c - x) / W]);
      widths.push(Math.sqrt(flow[c] / maxFlow));
      if (water[c] || drawn[c]) {
        break; // chegou ao mar, a um lago ou a outro rio
      }
      drawn[c] = 1;
      c = down[c];
    }
    if (points.length >= 4) {
      rivers.push({ points, widths });
    }
  }
  return rivers;
}

// ===== Países =====

/** Escolhe `count` células boas e afastadas entre si (capitais). Afrouxa a distância se não couber. */
function spreadOut(score: Float32Array, random: Random, count: number, minDistance: number, W: number): number[] {
  const candidates: number[] = [];
  const jittered = new Float32Array(score.length);
  for (let i = 0; i < score.length; i++) {
    if (score[i] > -Infinity) {
      candidates.push(i);
      jittered[i] = score[i] + random() * 0.6;
    }
  }
  candidates.sort((a, b) => jittered[b] - jittered[a] || a - b);
  const chosen: number[] = [];
  let spacing = minDistance;
  while (chosen.length < count && spacing > 1) {
    for (const i of candidates) {
      if (chosen.length >= count) {
        break;
      }
      if (chosen.every((c) => distance(c, i, W) >= spacing)) {
        chosen.push(i);
      }
    }
    spacing /= 2;
  }
  return chosen;
}

/** Cada terra vai para a capital mais "perto", onde atravessar montanha e rio custa mais (fronteiras naturais). */
function growCountries(
  capitals: number[],
  water: Uint8Array,
  biome: Uint8Array,
  river: Uint8Array,
  height: Float32Array,
  W: number,
  H: number,
): Int16Array {
  const N = W * H;
  const country = new Int16Array(N).fill(-1);
  const cost = new Float32Array(N).fill(Infinity);
  const heap = new MinHeap(N);
  capitals.forEach((c, id) => {
    cost[c] = 0;
    country[c] = id;
    heap.push(c, 0);
  });
  while (heap.size > 0) {
    const c = heap.pop();
    const cx = c % W;
    const cy = (c - cx) / W;
    for (const [dx, dy, step] of NEIGHBORS) {
      const x = cx + dx;
      const y = cy + dy;
      if (x < 0 || y < 0 || x >= W || y >= H) {
        continue;
      }
      const n = y * W + x;
      if (water[n]) {
        continue;
      }
      const mountain = biome[n] === Biome.Mountain || biome[n] === Biome.Snow;
      const next = cost[c] + step * (1 + (mountain ? 5 : 0) + (river[n] ? 1.5 : 0) + height[n] * 1.5);
      if (next < cost[n]) {
        cost[n] = next;
        country[n] = country[c];
        heap.push(n, next);
      }
    }
  }
  // Ilhas que não se ligam por terra ficam com a capital mais próxima em linha reta
  for (let i = 0; i < N; i++) {
    if (!water[i] && country[i] < 0 && capitals.length > 0) {
      let best = 0;
      for (let k = 1; k < capitals.length; k++) {
        if (distance(capitals[k], i, W) < distance(capitals[best], i, W)) {
          best = k;
        }
      }
      country[i] = best;
    }
  }
  return country;
}

/** Ponto da região mais longe de qualquer fronteira ou costa: bom lugar para o nome. */
function regionCenter(region: Int16Array, id: number, W: number, H: number): [number, number] {
  const dist = bfsDistance(region.length, W, H, (i) => region[i] !== id);
  let best = -1;
  for (let i = 0; i < region.length; i++) {
    if (region[i] === id && (best < 0 || dist[i] > dist[best])) {
      best = i;
    }
  }
  const x = best % W;
  return [x, (best - x) / W];
}

// ===== Nomes de florestas, serras, desertos, mares =====

const FEATURE_PREFIX: Record<FeatureKind, readonly string[]> = {
  forest: ['Floresta de ', 'Bosque de ', 'Mata de '],
  jungle: ['Selva de '],
  mountains: ['Montes ', 'Serra de ', 'Picos de '],
  desert: ['Deserto de '],
  swamp: ['Pântano de ', 'Charco de '],
  sea: ['Mar de ', 'Mar '],
  lake: ['Lago ', 'Lago de '],
};

function nameFeatures(
  biome: Uint8Array,
  ocean: Uint8Array,
  lake: Uint8Array,
  country: Int16Array,
  countries: Country[],
  names: NameMaker,
  random: Random,
  W: number,
  H: number,
): Feature[] {
  const N = W * H;
  const groups: [FeatureKind, (i: number) => boolean, number, number][] = [
    ['forest', (i) => biome[i] === Biome.Forest || biome[i] === Biome.Taiga, 3, Math.max(40, N * 0.004)],
    ['jungle', (i) => biome[i] === Biome.Rainforest, 2, Math.max(40, N * 0.004)],
    ['mountains', (i) => biome[i] === Biome.Mountain || biome[i] === Biome.Snow, 3, 25],
    ['desert', (i) => biome[i] === Biome.Desert, 2, 40],
    ['swamp', (i) => biome[i] === Biome.Swamp, 1, 25],
    ['lake', (i) => lake[i] === 1, 2, 8],
  ];
  const features: Feature[] = [];
  for (const [kind, member, max, minSize] of groups) {
    for (const component of components(member, W, H).filter((c) => c.length >= minSize).slice(0, max)) {
      const [x, y] = centerOf(component, W);
      const owner = country[Math.round(y) * W + Math.round(x)];
      const culture = owner >= 0 ? cultureByKey(countries[owner].culture) : pick(random, CULTURES);
      features.push({ name: pick(random, FEATURE_PREFIX[kind]) + names.name(culture), kind, x, y, size: component.length });
    }
  }
  // O mar: o ponto de oceano mais longe da terra, longe das bordas (onde o nome não caberia na moldura)
  const distLand = bfsDistance(N, W, H, (i) => !ocean[i]);
  let sea = -1;
  for (let i = 0; i < N; i++) {
    const x = i % W;
    const y = (i - x) / W;
    const inside = x > W * 0.15 && x < W * 0.85 && y > H * 0.08 && y < H * 0.92;
    if (ocean[i] && inside && (sea < 0 || distLand[i] > distLand[sea])) {
      sea = i;
    }
  }
  if (sea >= 0) {
    const x = sea % W;
    features.push({ name: pick(random, FEATURE_PREFIX.sea) + names.name(pick(random, CULTURES)), kind: 'sea', x, y: (sea - x) / W, size: 0 });
  }
  return features;
}

function cultureByKey(key: string): Culture {
  return CULTURES.find((c) => c.key === key) ?? CULTURES[0];
}

/** Grupos de células vizinhas que satisfazem `member`, do maior ao menor. */
function components(member: (i: number) => boolean, W: number, H: number): number[][] {
  const N = W * H;
  const seen = new Uint8Array(N);
  const result: number[][] = [];
  for (let start = 0; start < N; start++) {
    if (seen[start] || !member(start)) {
      continue;
    }
    const group = [start];
    seen[start] = 1;
    for (let q = 0; q < group.length; q++) {
      forNeighbors8(group[q], W, H, (n) => {
        if (!seen[n] && member(n)) {
          seen[n] = 1;
          group.push(n);
        }
      });
    }
    result.push(group);
  }
  return result.sort((a, b) => b.length - a.length);
}

/** Célula do grupo mais próxima do centro de massa (fica dentro mesmo em formas de "C"). */
function centerOf(group: number[], W: number): [number, number] {
  let sx = 0;
  let sy = 0;
  for (const i of group) {
    sx += i % W;
    sy += Math.floor(i / W);
  }
  const cx = sx / group.length;
  const cy = sy / group.length;
  let best = group[0];
  let bestD = Infinity;
  for (const i of group) {
    const d = (i % W - cx) ** 2 + (Math.floor(i / W) - cy) ** 2;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return [best % W, Math.floor(best / W)];
}

// ===== Utilidades de grade =====

function cell(i: number, W: number, rest: Omit<Settlement, 'x' | 'y'>): Settlement {
  const x = i % W;
  return { ...rest, x, y: (i - x) / W };
}

function distance(a: number, b: number, W: number): number {
  const ax = a % W;
  const bx = b % W;
  return Math.hypot(ax - bx, (a - ax) / W - (b - bx) / W);
}

function neighborIs(i: number, W: number, H: number, mask: Uint8Array): boolean {
  let found = false;
  forNeighbors4(i, W, H, (n) => {
    found ||= mask[n] === 1;
  });
  return found;
}

function forNeighbors4(i: number, W: number, H: number, visit: (n: number) => void): void {
  const x = i % W;
  const y = (i - x) / W;
  if (x > 0) visit(i - 1);
  if (x < W - 1) visit(i + 1);
  if (y > 0) visit(i - W);
  if (y < H - 1) visit(i + W);
}

function forNeighbors8(i: number, W: number, H: number, visit: (n: number) => void): void {
  const x = i % W;
  const y = (i - x) / W;
  for (const [dx, dy] of NEIGHBORS) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx >= 0 && ny >= 0 && nx < W && ny < H) {
      visit(ny * W + nx);
    }
  }
}

/** Distância (em passos de vizinhança 4) de cada célula até a mais próxima que satisfaz `source`. */
function bfsDistance(N: number, W: number, H: number, source: (i: number) => boolean): Float32Array {
  const dist = new Float32Array(N).fill(Infinity);
  const queue: number[] = [];
  for (let i = 0; i < N; i++) {
    if (source(i)) {
      dist[i] = 0;
      queue.push(i);
    }
  }
  for (let q = 0; q < queue.length; q++) {
    const c = queue[q];
    forNeighbors4(c, W, H, (n) => {
      if (dist[n] === Infinity) {
        dist[n] = dist[c] + 1;
        queue.push(n);
      }
    });
  }
  return dist;
}

function quantile(values: Float32Array, q: number): number {
  if (values.length === 0) {
    return 0;
  }
  const sorted = Float32Array.from(values).sort();
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor(q * (sorted.length - 1))))];
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** Fila de prioridade (menor primeiro) sobre índices de célula. */
class MinHeap {
  private readonly items: Int32Array;
  private readonly keys: Float32Array;
  size = 0;

  constructor(capacity: number) {
    this.items = new Int32Array(capacity * 8 + 8);
    this.keys = new Float32Array(capacity * 8 + 8);
  }

  push(item: number, key: number): void {
    let i = this.size++;
    this.items[i] = item;
    this.keys[i] = key;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.keys[parent] <= this.keys[i]) {
        break;
      }
      this.swap(i, parent);
      i = parent;
    }
  }

  pop(): number {
    const top = this.items[0];
    this.size--;
    this.items[0] = this.items[this.size];
    this.keys[0] = this.keys[this.size];
    let i = 0;
    for (;;) {
      const l = 2 * i + 1;
      const r = l + 1;
      let m = i;
      if (l < this.size && this.keys[l] < this.keys[m]) m = l;
      if (r < this.size && this.keys[r] < this.keys[m]) m = r;
      if (m === i) break;
      this.swap(i, m);
      i = m;
    }
    return top;
  }

  private swap(a: number, b: number): void {
    [this.items[a], this.items[b]] = [this.items[b], this.items[a]];
    [this.keys[a], this.keys[b]] = [this.keys[b], this.keys[a]];
  }
}
