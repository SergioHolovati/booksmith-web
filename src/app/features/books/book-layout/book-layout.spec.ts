import { BookDetail } from '../../../core/models/api.models';
import { layoutSummary } from '../book-export/book-export';
import { CHOICES, DEFAULT_LAYOUT, MODELS, TRIM_GROUPS, normalizeLayout, orientationOf, sameLayout, trimLabel } from './book-layout';
import { TRIM_MM } from '../../../core/util/print-geometry';

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

  it('formatos: em pé, quadrado, deitado; cada tamanho tem medida', () => {
    expect(orientationOf('a5')).toBe('portrait');
    expect(orientationOf('20x20')).toBe('square');
    expect(orientationOf('8.25x6')).toBe('landscape');
    expect(orientationOf('custom')).toBe('custom');
    for (const group of TRIM_GROUPS) {
      for (const trim of group.trims) {
        const [w, h] = TRIM_MM[trim.value];
        const shape = w === h ? 'square' : w > h ? 'landscape' : 'portrait';
        expect(shape).toBe(group.value);
      }
    }
  });

  it('o nome do tamanho, inclusive o personalizado', () => {
    expect(trimLabel({ ...DEFAULT_LAYOUT, trim: '20x20' })).toBe('20×20');
    expect(trimLabel({ ...DEFAULT_LAYOUT, trim: 'custom', customWidthMm: 230.5, customHeightMm: 180 })).toBe(
      'Personalizado 230,5×180 mm',
    );
  });
});
