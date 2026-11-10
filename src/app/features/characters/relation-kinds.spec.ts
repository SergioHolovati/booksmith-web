import { CharacterSummary, Relation } from '../../core/models/api.models';
import { describeFor, relationLayout } from './relation-kinds';

const ref = (id: string, name: string) => ({ id, name });
const relation = (from: string, to: string, kind: Relation['kind']): Relation => ({
  id: `${from}-${to}-${kind}`,
  universeId: 'u',
  from: ref(from, from.toUpperCase()),
  to: ref(to, to.toUpperCase()),
  kind,
  directed: kind === 'parent',
  description: null,
  since: null,
  until: null,
  version: 0,
  updatedAt: '',
});
const character = (id: string): CharacterSummary =>
  ({ id, name: id.toUpperCase(), aliases: [], role: null, appearanceSummary: '', portraitUrl: null, updatedAt: '' }) as CharacterSummary;

describe('relações entre personagens', () => {
  it('cada lado lê a relação do seu jeito', () => {
    const mother = relation('ana', 'lia', 'parent');
    expect(describeFor(mother, 'ana')).toEqual({ text: 'pai ou mãe de', other: 'LIA', otherId: 'lia' });
    expect(describeFor(mother, 'lia')).toEqual({ text: 'filho ou filha de', other: 'ANA', otherId: 'ana' });
    expect(describeFor(relation('ana', 'kael', 'rival'), 'kael').text).toBe('rival de');
  });

  it('o mapa põe no círculo só quem tem relação, os mais ligados primeiro', () => {
    const layout = relationLayout(
      [character('ana'), character('lia'), character('kael'), character('solo')],
      [relation('ana', 'lia', 'parent'), relation('ana', 'kael', 'rival')],
    );
    expect(layout.map((n) => n.id)).toEqual(['ana', 'kael', 'lia']);
    expect(layout[0]).toMatchObject({ x: 50, y: 12, links: 2 });
    for (const node of layout) {
      expect(node.x).toBeGreaterThanOrEqual(0);
      expect(node.x).toBeLessThanOrEqual(100);
    }
  });
});
