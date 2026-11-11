import { BookDetail } from '../../../core/models/api.models';
import { layoutSummary } from '../book-export/book-export';
import { CHOICES, DEFAULT_LAYOUT, MODELS, normalizeLayout, sameLayout } from './book-layout';

describe('diagramação', () => {
  it('livro antigo, sem diagramação, abre no padrão; o que não é escolha fica de fora', () => {
    expect(normalizeLayout(undefined)).toEqual(DEFAULT_LAYOUT);
    const extra = { trim: '6x9', empty: true, fontSize: null } as unknown as Parameters<typeof normalizeLayout>[0];
    expect(normalizeLayout(extra)).toEqual({ ...DEFAULT_LAYOUT, trim: '6x9' });
  });

  it('cada modelo usa só opções que existem', () => {
    for (const model of MODELS) {
      for (const choice of CHOICES) {
        const values = choice.options.map((o) => o.value as unknown);
        expect(values).toContain(model.layout[choice.key]);
      }
    }
    expect(sameLayout(MODELS[0].layout, DEFAULT_LAYOUT)).toBe(true);
  });

  it('o resumo diz o modelo, ou "Personalizada"', () => {
    expect(layoutSummary({ layout: DEFAULT_LAYOUT } as BookDetail)).toBe('Clássico · A5, letra 11');
    expect(layoutSummary({ layout: { ...DEFAULT_LAYOUT, fontSize: 10.5 } } as BookDetail)).toBe(
      'Personalizada · A5, letra 10,5',
    );
  });
});
