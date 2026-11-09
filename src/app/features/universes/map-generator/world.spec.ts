import { CULTURES, NameMaker, tidy } from './names';
import { seededRandom } from './random';
import { Biome, MapSettings, defaultSettings, generateWorld } from './world';

const settings = (overrides: Partial<MapSettings> = {}): MapSettings => ({
  ...defaultSettings('vel-42'),
  ...overrides,
});

describe('gerador de mapa', () => {
  it('a mesma semente gera o mesmo mundo', () => {
    const a = generateWorld(settings({ size: 'small' }));
    const b = generateWorld(settings({ size: 'small' }));
    expect(a.countries.map((c) => c.name)).toEqual(b.countries.map((c) => c.name));
    expect(a.settlements).toEqual(b.settlements);
    expect(Array.from(a.biome)).toEqual(Array.from(b.biome));
    const other = generateWorld(settings({ size: 'small', seed: 'outra' }));
    expect(other.settlements).not.toEqual(a.settlements);
  });

  it('a quantidade de terra segue o ajuste, e a borda é mar', () => {
    for (const [land, expected] of [
      ['little', 0.3],
      ['much', 0.55],
    ] as const) {
      const world = generateWorld(settings({ size: 'small', land }));
      const landCells = world.water.reduce((sum, w) => sum + (w ? 0 : 1), 0);
      expect(landCells / world.water.length).toBeCloseTo(expected, 1);
      expect(world.water[0]).toBe(1);
      expect(world.water[world.water.length - 1]).toBe(1);
    }
  });

  it('cada país tem capital em terra, nome e território', () => {
    const world = generateWorld(settings({ countries: 5 }));
    expect(world.countries).toHaveLength(5);
    for (const c of world.countries) {
      expect(world.water[c.capital]).toBe(0);
      expect(world.country[c.capital]).toBe(c.id);
      expect(c.area).toBeGreaterThan(0);
      expect(c.name.length).toBeGreaterThanOrEqual(4);
    }
    // toda terra pertence a algum país
    world.water.forEach((w, i) => {
      if (!w) {
        expect(world.country[i]).toBeGreaterThanOrEqual(0);
      }
    });
  });

  it('cidades ficam em terra, sem nomes repetidos', () => {
    const world = generateWorld(settings({ countries: 4, size: 'medium' }));
    const capitals = world.settlements.filter((s) => s.kind === 'capital');
    expect(capitals).toHaveLength(4);
    expect(world.settlements.filter((s) => s.kind === 'city').length).toBeGreaterThan(0);
    for (const s of world.settlements) {
      expect(world.water[s.y * world.width + s.x]).toBe(0);
    }
    const names = [...world.settlements.map((s) => s.name), ...world.countries.map((c) => c.name)];
    expect(new Set(names).size).toBe(names.length);
  });

  it('rios descem até a água ou encontram outro rio', () => {
    const world = generateWorld(settings({ size: 'medium' }));
    expect(world.rivers.length).toBeGreaterThan(0);
    for (const river of world.rivers) {
      const [x, y] = river.points[river.points.length - 1];
      const end = y * world.width + x;
      const joinsAnother = world.rivers.some(
        (other) => other !== river && other.points.some(([ox, oy]) => ox === x && oy === y),
      );
      expect(world.water[end] === 1 || joinsAnother).toBe(true);
    }
  });

  it('o clima muda os biomas', () => {
    const count = (world: ReturnType<typeof generateWorld>, biome: Biome) =>
      world.biome.reduce((sum, b) => sum + (b === biome ? 1 : 0), 0);
    const cold = generateWorld(settings({ size: 'small', climate: 'cold' }));
    const hot = generateWorld(settings({ size: 'small', climate: 'hot' }));
    expect(count(cold, Biome.Tundra) + count(cold, Biome.Taiga)).toBeGreaterThan(
      count(hot, Biome.Tundra) + count(hot, Biome.Taiga),
    );
    expect(count(hot, Biome.Desert) + count(hot, Biome.Savanna)).toBeGreaterThan(
      count(cold, Biome.Desert) + count(cold, Biome.Savanna),
    );
  });

  it('nomes inventados são legíveis e não se repetem', () => {
    expect(tidy('vallldor')).toBe('Valldor');
    expect(tidy('kes-turan')).toBe('Kes-Turan');
    const maker = new NameMaker(seededRandom('nomes'));
    const names = Array.from({ length: 40 }, () => maker.name(CULTURES[0]));
    expect(new Set(names).size).toBe(40);
  });
});
