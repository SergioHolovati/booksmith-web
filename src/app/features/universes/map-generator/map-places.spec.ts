import { mapPlaces, selectedBatch } from './map-places';
import { defaultSettings, generateWorld } from './world';

describe('lugares do mapa gerado', () => {
  const world = generateWorld({ ...defaultSettings('vel-42'), countries: 3 });
  const drafts = mapPlaces(world);

  it('cada país vem antes das suas cidades, que ficam dentro dele', () => {
    const realms = drafts.filter((d) => d.type === 'realm');
    expect(realms.map((r) => r.name)).toEqual(world.countries.map((c) => c.name));
    for (const draft of drafts) {
      if (draft.parentKey) {
        const parentIndex = drafts.findIndex((d) => d.key === draft.parentKey);
        expect(parentIndex).toBeGreaterThanOrEqual(0);
        expect(parentIndex).toBeLessThan(drafts.indexOf(draft));
      }
    }
    expect(drafts.filter((d) => d.label === 'Capital')).toHaveLength(3);
  });

  it('todos os lugares têm posição dentro do mapa e nomes únicos', () => {
    for (const draft of drafts) {
      expect(draft.x).toBeGreaterThanOrEqual(0);
      expect(draft.x).toBeLessThanOrEqual(1);
      expect(draft.y).toBeGreaterThanOrEqual(0);
      expect(draft.y).toBeLessThanOrEqual(1);
    }
    expect(new Set(drafts.map((d) => d.name)).size).toBe(drafts.length);
  });

  it('a capital tem uma descrição inicial e o mar vem fora dos países', () => {
    const capital = drafts.find((d) => d.label === 'Capital');
    expect(capital?.description).toMatch(/^Capital de /);
    const sea = drafts.find((d) => d.label === 'Mar');
    expect(sea?.parentKey).toBeNull();
    expect(sea?.group).toBe('Mares e lagos');
  });

  it('só os escolhidos vão no lote, e quem perdeu o "dentro de" vai solto', () => {
    const realm = drafts.find((d) => d.type === 'realm')!;
    const town = drafts.find((d) => d.parentKey === realm.key)!;
    const batch = selectedBatch(drafts, new Set([town.key]));
    expect(batch).toHaveLength(1);
    expect(batch[0].parentKey).toBeNull();
    expect('group' in batch[0]).toBe(false);
    expect(selectedBatch(drafts, new Set([realm.key, town.key]))[1].parentKey).toBe(realm.key);
  });
});
