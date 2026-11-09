import { AppearanceValues, LoreDraft } from '../../../core/models/api.models';
import { CULTURES, Culture, NameMaker } from './names';
import { Random, fork, pick } from './random';
import { World } from './world';

/**
 * O contexto do mundo gerado com o mapa, sem IA: um idioma por cultura (os países da mesma cultura falam a
 * mesma língua), duas ou três religiões que se espalham de país vizinho em país vizinho, um sistema político
 * por país e algumas organizações. Tudo sai da semente, como o mapa; os lugares vão pelo nome.
 */
export function generateLore(world: World): LoreDraft[] {
  const random = fork(`${world.settings.seed}/v${world.settings.version}`, 'mundo');
  const names = new NameMaker(random);
  const cultureOf = (key: string) => CULTURES.find((c) => c.key === key) ?? CULTURES[0];
  const capitalOf = (id: number) => world.settlements.find((s) => s.country === id && s.kind === 'capital')?.name;
  const countryPlaces = (ids: number[]) => ids.map((id) => world.countries[id].name);
  const drafts: LoreDraft[] = [];

  // ===== Idiomas: um por cultura presente no mapa =====
  const byCulture = new Map<string, number[]>();
  for (const country of world.countries) {
    byCulture.set(country.culture, [...(byCulture.get(country.culture) ?? []), country.id]);
  }
  for (const [cultureKey, ids] of byCulture) {
    const culture = cultureOf(cultureKey);
    drafts.push({
      type: 'language',
      name: languageName(world.countries[ids[0]].name),
      values: {
        sound: [...LANGUAGE_SOUND[cultureKey]],
        writing: pick(random, ['alphabet', 'runes', 'ideograms', 'alphabet']),
        status: 'living',
        speakers: Math.min(5, 2 + ids.length),
        greeting: names.name(culture).toLowerCase(),
        names: `Nomes como ${names.name(culture)} e ${names.name(culture)}`,
      },
      placeNames: countryPlaces(ids),
    });
  }

  // ===== Religiões: começam em países sorteados e se espalham pelos vizinhos =====
  const neighbors = adjacency(world);
  const religionCount = Math.min(world.countries.length, world.countries.length >= 4 ? 3 : 2);
  const seeds = shuffle(random, world.countries.map((c) => c.id)).slice(0, religionCount);
  const faithOf = new Map<number, number>(seeds.map((id, r) => [id, r]));
  const queue = [...seeds];
  while (queue.length) {
    const id = queue.shift() as number;
    for (const next of shuffle(random, [...(neighbors.get(id) ?? [])])) {
      if (!faithOf.has(next)) {
        faithOf.set(next, faithOf.get(id) as number);
        queue.push(next);
      }
    }
  }
  // Ilhas sem vizinho ficam com a religião sorteada
  world.countries.forEach((c) => faithOf.has(c.id) || faithOf.set(c.id, Math.floor(random() * religionCount)));
  seeds.forEach((seed, r) => {
    const culture = cultureOf(world.countries[seed].culture);
    const deity = names.name(culture);
    const kind = pick(random, ['polytheist', 'monotheist', 'ancestors', 'nature', 'philosophy']);
    const countries = world.countries.filter((c) => faithOf.get(c.id) === r).map((c) => c.id);
    drafts.push({
      type: 'religion',
      name: religionName(random, kind, deity),
      values: {
        kind,
        deities: kind === 'polytheist' ? `${deity}, ${names.name(culture)} e ${names.name(culture)}` : deity,
        attitude: pick(random, ['tolerant', 'missionary', 'hostile', 'indifferent']),
        influence: 3 + Math.floor(random() * 3),
      },
      placeNames: countryPlaces(countries),
    });
  });

  // ===== Um sistema político por país =====
  for (const country of world.countries) {
    const culture = cultureOf(country.culture);
    const form = pick(random, GOVERNMENTS[country.culture]);
    const ruler = names.name(culture);
    const values: AppearanceValues = {
      form,
      ruler: `${pick(random, RULER_TITLE[form])} ${ruler}`,
      succession: SUCCESSION[form],
      freedom: form === 'republic' || form === 'clans' ? 3 + Math.floor(random() * 2) : 1 + Math.floor(random() * 3),
      stability: 2 + Math.floor(random() * 4),
      corruption: 1 + Math.floor(random() * 5),
    };
    drafts.push({ type: 'government', name: governmentName(form, country.name), values, placeNames: [country.name] });
  }

  // ===== Organizações: uma guilda de comércio e uma ordem =====
  const big = [...world.countries].sort((a, b) => b.area - a.area);
  if (big[0]) {
    const capital = capitalOf(big[0].id) ?? big[0].name;
    drafts.push({
      type: 'organization',
      name: `Guilda dos Mercadores de ${capital}`,
      values: { kind: 'company', goal: 'Controlar as rotas de comércio entre os reinos.', reach: 4, reputation: 'respected' },
      placeNames: countryPlaces(big.slice(0, Math.min(3, big.length)).map((c) => c.id)),
    });
  }
  if (big[1] ?? big[0]) {
    const home = big[1] ?? big[0];
    drafts.push({
      type: 'organization',
      name: `Ordem de ${names.name(cultureOf(home.culture))}`,
      values: { kind: pick(random, ['order', 'secret', 'academy']), reach: 3, reputation: pick(random, ['feared', 'respected', 'unknown']) },
      placeNames: [home.name],
    });
  }
  return drafts;
}

const LANGUAGE_SOUND: Record<string, readonly string[]> = {
  meridional: ['melodic', 'fast'],
  nortenha: ['guttural', 'harsh'],
  arida: ['sibilant', 'fast'],
  elfica: ['melodic', 'soft'],
};

const GOVERNMENTS: Record<string, readonly string[]> = {
  meridional: ['monarchy', 'republic', 'oligarchy'],
  nortenha: ['monarchy', 'clans', 'clans'],
  arida: ['empire', 'theocracy', 'dictatorship'],
  elfica: ['magocracy', 'oligarchy', 'monarchy'],
};

const RULER_TITLE: Record<string, readonly string[]> = {
  monarchy: ['Rei', 'Rainha'],
  empire: ['Imperador', 'Imperatriz'],
  republic: ['Cônsul', 'Chanceler'],
  theocracy: ['Sumo-sacerdote', 'Grã-sacerdotisa'],
  oligarchy: ['Mestre', 'Senhora'],
  clans: ['Chefe', 'Matriarca'],
  dictatorship: ['General', 'Protetor'],
  magocracy: ['Arquimago', 'Arquimaga'],
};

const SUCCESSION: Record<string, string> = {
  monarchy: 'heredity',
  empire: 'heredity',
  republic: 'election',
  theocracy: 'divine',
  oligarchy: 'council',
  clans: 'council',
  dictatorship: 'force',
  magocracy: 'merit',
};

function governmentName(form: string, country: string): string {
  const prefix: Record<string, string> = {
    monarchy: 'Coroa de',
    empire: 'Império de',
    republic: 'República de',
    theocracy: 'Teocracia de',
    oligarchy: 'Conselho dos Mercadores de',
    clans: 'Conselho dos Clãs de',
    dictatorship: 'Protetorado de',
    magocracy: 'Círculo dos Magos de',
  };
  return `${prefix[form] ?? 'Governo de'} ${country}`;
}

function religionName(random: Random, kind: string, deity: string): string {
  switch (kind) {
    case 'monotheist':
      return pick(random, [`Igreja de ${deity}`, `Fé em ${deity}`]);
    case 'ancestors':
      return `Culto dos Ancestrais de ${deity}`;
    case 'nature':
      return pick(random, [`Círculo de ${deity}`, `Guardiões de ${deity}`]);
    case 'philosophy':
      return `Caminho de ${deity}`;
    default:
      return pick(random, [`Panteão de ${deity}`, `Culto de ${deity}`]);
  }
}

/** "Valdfjord" → "Valdfjordês"; "Maranela" → "Maranelês"; "Tar-Turan" → "Tar-Turanês". */
export function languageName(country: string): string {
  const root = country.replace(/[aeiou]$/i, '');
  return `${root}ês`;
}

/** Países que fazem fronteira por terra. */
function adjacency(world: World): Map<number, Set<number>> {
  const result = new Map<number, Set<number>>();
  const { width: W, height: H, country } = world;
  const link = (a: number, b: number) => {
    if (a >= 0 && b >= 0 && a !== b) {
      (result.get(a) ?? result.set(a, new Set()).get(a)!).add(b);
      (result.get(b) ?? result.set(b, new Set()).get(b)!).add(a);
    }
  };
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (x < W - 1) link(country[i], country[i + 1]);
      if (y < H - 1) link(country[i], country[i + W]);
    }
  }
  return result;
}

function shuffle<T>(random: Random, items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export type { Culture };
