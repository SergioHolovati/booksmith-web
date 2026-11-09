import { generateLore, languageName } from './world-lore';
import { defaultSettings, generateWorld } from './world';

describe('contexto do mundo gerado', () => {
  const world = generateWorld({ ...defaultSettings('vel-42'), countries: 5 });
  const lore = generateLore(world);
  const countryNames = world.countries.map((c) => c.name);

  it('a mesma semente gera o mesmo mundo', () => {
    expect(generateLore(world)).toEqual(lore);
  });

  it('cada país tem um governo e fala algum idioma', () => {
    const governments = lore.filter((l) => l.type === 'government');
    expect(governments).toHaveLength(5);
    expect(governments.flatMap((g) => g.placeNames).sort()).toEqual([...countryNames].sort());
    const spoken = lore.filter((l) => l.type === 'language').flatMap((l) => l.placeNames);
    expect([...spoken].sort()).toEqual([...countryNames].sort());
  });

  it('cada país segue uma religião, e há duas ou três', () => {
    const religions = lore.filter((l) => l.type === 'religion');
    expect(religions.length).toBeGreaterThanOrEqual(2);
    expect(religions.length).toBeLessThanOrEqual(3);
    expect(religions.flatMap((r) => r.placeNames).sort()).toEqual([...countryNames].sort());
  });

  it('nomes de idioma soam como gentílicos', () => {
    expect(languageName('Valdfjord')).toBe('Valdfjordês');
    expect(languageName('Maranela')).toBe('Maranelês');
    expect(languageName('Tar-Turan')).toBe('Tar-Turanês');
  });
});
