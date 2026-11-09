import { MapPlace, PlaceType } from '../../../core/models/api.models';
import { Biome, Feature, FeatureKind, Settlement, World } from './world';

/** Um lugar do mapa, já com o grupo em que aparece na lista ("Valdfjord", "Mares e lagos"). */
export interface MapPlaceDraft extends MapPlace {
  group: string;
  /** Rótulo curto do tipo na lista ("Capital", "Vilarejo", "Floresta"). */
  label: string;
}

const FEATURE_TYPE: Record<FeatureKind, PlaceType> = {
  forest: 'nature',
  jungle: 'nature',
  mountains: 'mountain',
  desert: 'nature',
  swamp: 'nature',
  sea: 'water',
  lake: 'water',
};

const FEATURE_LABEL: Record<FeatureKind, string> = {
  forest: 'Floresta',
  jungle: 'Selva',
  mountains: 'Serra',
  desert: 'Deserto',
  swamp: 'Pântano',
  sea: 'Mar',
  lake: 'Lago',
};

const BIOME_LABEL: Partial<Record<Biome, string>> = {
  [Biome.Snow]: 'neves eternas',
  [Biome.Tundra]: 'tundra fria',
  [Biome.Taiga]: 'florestas de pinheiros',
  [Biome.Grassland]: 'campos abertos',
  [Biome.Forest]: 'florestas',
  [Biome.Rainforest]: 'selva úmida',
  [Biome.Desert]: 'deserto',
  [Biome.Savanna]: 'savana',
  [Biome.Swamp]: 'pântanos',
  [Biome.Mountain]: 'montanhas',
};

/**
 * Os lugares que o mapa gerado tem, prontos para virar lugares do universo: cada país com sua capital, cidades
 * e vilarejos dentro dele, e as florestas, serras e desertos do país; mar e lagos fora de país. A posição vai em
 * frações da imagem, e a descrição inicial sai do que o mapa sabe (costa, rio, paisagem).
 */
export function mapPlaces(world: World): MapPlaceDraft[] {
  const { width: W, height: H } = world;
  const at = (x: number, y: number) => Math.round(y) * W + Math.round(x);
  const fx = (x: number) => round(x / (W - 1));
  const fy = (y: number) => round(y / (H - 1));
  const riverCells = new Set<number>();
  for (const river of world.rivers) {
    for (const [x, y] of river.points) {
      riverCells.add(at(x, y));
    }
  }
  const nearRiver = (x: number, y: number) => around(x, y, W, H, 1).some((i) => riverCells.has(i));
  const nearCoast = (x: number, y: number) =>
    around(x, y, W, H, 2).some((i) => world.water[i] === 1 && world.lake[i] === 0);

  const result: MapPlaceDraft[] = [];
  for (const country of world.countries) {
    const key = `country-${country.id}`;
    const towns = world.settlements.filter((s) => s.country === country.id);
    const capital = towns.find((s) => s.kind === 'capital');
    const landscape = dominantLandscape(world, country.id);
    result.push({
      key,
      name: country.name,
      type: 'realm',
      parentKey: null,
      x: fx(country.label[0]),
      y: fy(country.label[1]),
      description: sentence([
        capital ? `Capital: ${capital.name}` : null,
        `${towns.length - (capital ? 1 : 0)} outras cidades e vilarejos`,
      ]),
      atmosphere: landscape ? `Terra de ${landscape}.` : null,
      group: country.name,
      label: 'País',
    });
    // Capital primeiro: as outras ficam dentro do país (não da capital)
    const ordered = [...towns].sort((a, b) => rank(a) - rank(b));
    ordered.forEach((town, n) => {
      result.push({
        key: `${key}-town-${n}`,
        name: town.name,
        type: town.kind === 'village' ? 'town' : 'city',
        parentKey: key,
        x: fx(town.x),
        y: fy(town.y),
        description: sentence([
          town.kind === 'capital' ? `Capital de ${country.name}` : town.kind === 'city' ? `Cidade de ${country.name}` : `Vilarejo de ${country.name}`,
          nearCoast(town.x, town.y) ? 'no litoral' : null,
          nearRiver(town.x, town.y) ? 'à beira de um rio' : null,
        ], ', '),
        atmosphere: BIOME_LABEL[world.biome[at(town.x, town.y)] as Biome]
          ? `Arredores: ${BIOME_LABEL[world.biome[at(town.x, town.y)] as Biome]}.`
          : null,
        group: country.name,
        label: town.kind === 'capital' ? 'Capital' : town.kind === 'city' ? 'Cidade' : 'Vilarejo',
      });
    });
    world.features
      .filter((f) => f.kind !== 'sea' && world.country[at(f.x, f.y)] === country.id)
      .forEach((feature, n) => result.push(featurePlace(feature, `${key}-feature-${n}`, key, country.name, fx, fy)));
  }
  world.features
    .filter((f) => f.kind === 'sea' || world.country[at(f.x, f.y)] < 0)
    .forEach((feature, n) => result.push(featurePlace(feature, `water-${n}`, null, 'Mares e lagos', fx, fy)));
  return result;
}

function featurePlace(
  feature: Feature,
  key: string,
  parentKey: string | null,
  group: string,
  fx: (x: number) => number,
  fy: (y: number) => number,
): MapPlaceDraft {
  return {
    key,
    name: feature.name,
    type: FEATURE_TYPE[feature.kind],
    parentKey,
    x: fx(feature.x),
    y: fy(feature.y),
    description: feature.kind === 'sea' ? 'O mar que cerca o continente.' : null,
    atmosphere: null,
    group,
    label: FEATURE_LABEL[feature.kind],
  };
}

/**
 * Lote para enviar: só os escolhidos. Se o "dentro de" de um item não foi escolhido, o item vai sem ele
 * (o servidor só liga itens do mesmo lote).
 */
export function selectedBatch(drafts: MapPlaceDraft[], chosen: ReadonlySet<string>): MapPlace[] {
  return drafts
    .filter((d) => chosen.has(d.key))
    .map(({ group: _group, label: _label, ...place }) => ({
      ...place,
      parentKey: place.parentKey && chosen.has(place.parentKey) ? place.parentKey : null,
    }));
}

function dominantLandscape(world: World, countryId: number): string | null {
  const counts = new Map<Biome, number>();
  world.country.forEach((c, i) => {
    if (c === countryId) {
      const biome = world.biome[i] as Biome;
      counts.set(biome, (counts.get(biome) ?? 0) + 1);
    }
  });
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2);
  const labels = top.map(([biome]) => BIOME_LABEL[biome]).filter((l): l is string => !!l);
  return labels.length ? labels.join(' e ') : null;
}

function rank(s: Settlement): number {
  return s.kind === 'capital' ? 0 : s.kind === 'city' ? 1 : 2;
}

function sentence(parts: (string | null)[], separator = '. '): string {
  const text = parts.filter((p): p is string => !!p).join(separator);
  return text ? `${text}.` : '';
}

function around(x: number, y: number, W: number, H: number, radius: number): number[] {
  const cells: number[] = [];
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const nx = Math.round(x) + dx;
      const ny = Math.round(y) + dy;
      if (nx >= 0 && ny >= 0 && nx < W && ny < H) {
        cells.push(ny * W + nx);
      }
    }
  }
  return cells;
}

function round(value: number): number {
  return Math.round(Math.min(1, Math.max(0, value)) * 10000) / 10000;
}
