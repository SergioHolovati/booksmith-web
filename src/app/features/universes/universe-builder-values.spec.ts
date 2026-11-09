import { UniverseBuilderDefinition, UniverseDetails } from '../../core/models/api.models';
import { itemTitle, itemsOf, plainValues, universePortrait, universeProgress, withItems } from './universe-builder-values';

const FORM: UniverseBuilderDefinition = {
  id: 'universe-builder',
  version: 1,
  tabs: [
    {
      key: 'idea',
      label: 'Ideia',
      fields: [
        { key: 'premise', label: 'Premissa', type: 'longtext' },
        { key: 'tone', label: 'Tom', type: 'multi', options: [{ value: 'dark', label: 'Sombrio' }] },
      ],
    },
    { key: 'map', label: 'Mapa', map: true, fields: [] },
    { key: 'magic', label: 'Magia', collection: 'magic', fields: [] },
  ],
  collections: {
    magic: {
      label: 'Sistema de magia',
      add: 'Criar magia',
      titleField: 'name',
      max: 30,
      fields: [{ key: 'name', label: 'Nome', type: 'text' }],
    },
  },
};

describe('construtor de universo', () => {
  const details: UniverseDetails = {
    premise: 'Memórias à venda',
    tone: ['dark'],
    magic: [{ id: 'a', name: 'Tecelagem' }, { id: 'b' }],
  };

  it('separa campos simples das coleções', () => {
    expect(plainValues(FORM, details)).toEqual({ premise: 'Memórias à venda', tone: ['dark'] });
    expect(itemsOf(details, 'magic').map((m) => m.id)).toEqual(['a', 'b']);
    expect(itemsOf(details, 'laws')).toEqual([]);
  });

  it('dá nome aos itens sem título', () => {
    const magic = FORM.collections['magic'];
    expect(itemTitle(magic, { id: 'a', name: 'Tecelagem' }, 0)).toBe('Tecelagem');
    expect(itemTitle(magic, { id: 'b' }, 1)).toBe('Sistema de magia 2');
  });

  it('monta o retrato com campos, mapa e itens', () => {
    expect(universePortrait(FORM, details, 'http://mapa.png')).toEqual([
      { tab: 'Ideia', text: 'Premissa: Memórias à venda · Tom: Sombrio' },
      { tab: 'Mapa', text: 'Mapa desenhado' },
      { tab: 'Magia', text: 'Tecelagem, Sistema de magia 2' },
    ]);
  });

  it('conta campos, mapa e coleções no progresso', () => {
    expect(universeProgress(FORM, details, null)).toEqual({ filled: 3, total: 4 });
    expect(universeProgress(FORM, withItems(details, 'magic', []), 'http://mapa.png')).toEqual({ filled: 3, total: 4 });
  });
});
