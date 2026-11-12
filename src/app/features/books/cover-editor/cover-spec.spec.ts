import { PrintCoverSpec } from '../../../core/models/api.models';
import { parseCoverSpec, specTemplate } from './cover-spec';

/** A especificação que veio com a capa de "A conversão". */
const PASTED = `Capa — A Conversão (v6 "a pista", 11/11/2026)
Impressão (gráfica tradicional)
16 × 23 cm, sangria 5 mm, marcas de corte, CMYK (carga máx. ~295%), arte 300 dpi.
Lombada 48 mm = 800 p. em Pólen Soft 80 g. Recalcular com a gráfica. Capa completa 378 × 240 mm com sangria.
Ebook
JPG 1800 × 2588 px, RGB.`;

describe('especificação da capa', () => {
  it('lê o tamanho, a lombada e a sangria do texto colado, ignorando a capa aberta e o e-book', () => {
    expect(parseCoverSpec(PASTED)).toEqual({ trim: '16x23', spineMm: 48, bleedMm: 5 });
  });

  it('aceita mm, A5, polegadas e vírgula decimal', () => {
    expect(parseCoverSpec('Livro 140 x 210 mm, lombada de 12,5 mm')).toEqual({ trim: '14x21', spineMm: 12.5 });
    expect(parseCoverSpec('Formato A5, sangria: 3 mm')).toEqual({ trim: 'a5', bleedMm: 3 });
    expect(parseCoverSpec('6 x 9 pol., sangria 3,2 mm')).toEqual({ trim: '6x9', bleedMm: 3.2 });
    expect(parseCoverSpec('capa bonita')).toEqual({});
  });

  it('o modelo traz as medidas do livro e volta a ser lido do mesmo jeito', () => {
    const spec = {
      profile: 'custom', pages: 300, trimWidthMm: 160, trimHeightMm: 230, spineMm: 18, bleedMm: 5,
      widthMm: 348, heightMm: 240, spineText: true, warnings: [], imported: null, importedWidthMm: null,
      importedHeightMm: null, importedFits: null, importedTrim: null, importedSpineMm: null, importedMarksMm: null,
    } as PrintCoverSpec;

    const text = specTemplate(spec, 'A conversão', 'S F Holovati', 'Outra gráfica');

    expect(text).toContain('Capa — A conversão (S F Holovati)');
    expect(text).toContain('Capa aberta com sangria: 348 × 240 mm');
    expect(text).toContain('1800 × 2588 px');
    expect(parseCoverSpec(text)).toEqual({ trim: '16x23', spineMm: 18, bleedMm: 5 });
  });
});
