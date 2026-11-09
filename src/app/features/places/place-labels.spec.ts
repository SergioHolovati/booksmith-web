import { PlaceSummary } from '../../core/models/api.models';
import { placeTree, selfAndDescendants } from './place-labels';

function place(id: string, name: string, parentId: string | null = null): PlaceSummary {
  return { id, name, parentId, aliases: [], type: null, parentName: null, excerpt: null, mapX: null, mapY: null, updatedAt: '' };
}

describe('lugares em árvore', () => {
  const places = [
    place('cafe', 'Café da Esquina', 'centro'),
    place('sp', 'São Paulo'),
    place('centro', 'Centro', 'sp'),
    place('casa', 'Casa da Lia', 'sp'),
    place('mar', 'Alto-mar'),
    place('orfao', 'Ilha', 'apagado'),
  ];

  it('mostra cada lugar seguido do que está dentro dele, em ordem alfabética', () => {
    expect(placeTree(places).map((n) => `${'-'.repeat(n.depth)}${n.place.name}`)).toEqual([
      'Alto-mar',
      'Ilha',
      'São Paulo',
      '-Casa da Lia',
      '-Centro',
      '--Café da Esquina',
    ]);
  });

  it('não deixa escolher como "dentro de" o próprio lugar nem o que está dentro dele', () => {
    expect([...selfAndDescendants(places, 'sp')].sort()).toEqual(['cafe', 'casa', 'centro', 'sp']);
    expect([...selfAndDescendants(places, 'mar')]).toEqual(['mar']);
  });
});
