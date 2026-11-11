import { PrintCoverSpec } from '../../../core/models/api.models';
import { PRINT_PX_PER_MM, printPanels, printSize } from './print-cover-canvas';
import { PROFILES, mm, parseMm } from './print-cover';

const SPEC: PrintCoverSpec = {
  profile: 'kdp-white',
  pages: 200,
  trimWidthMm: 152.4,
  trimHeightMm: 228.6,
  spineMm: 11.4,
  bleedMm: 3.2,
  widthMm: 322.6,
  heightMm: 235,
  spineText: true,
  warnings: [],
  imported: null,
  importedWidthMm: null,
  importedHeightMm: null,
  importedFits: null,
};

describe('capa para gráfica', () => {
  it('contracapa, lombada e frente ficam na ordem, com a sangria por fora', () => {
    const { backEnd, spineEnd } = printPanels(SPEC);
    expect(backEnd).toBeCloseTo(155.6);
    expect(spineEnd).toBeCloseTo(167);
    // a frente vai da lombada até o fim, menos a sangria: a largura do livro
    expect(SPEC.widthMm - SPEC.bleedMm - spineEnd).toBeCloseTo(SPEC.trimWidthMm, 0);
  });

  it('em 300 DPI, 6×9 com 200 páginas dá uns 3810 × 2776 pixels', () => {
    expect(printSize(SPEC, PRINT_PX_PER_MM)).toEqual({ width: 3810, height: 2776 });
  });

  it('medidas em português e os quatro destinos', () => {
    expect(mm(315.44)).toBe('315,4');
    expect(parseMm('12,5')).toBe(12.5);
    expect(parseMm(' 9.75 ')).toBe(9.75);
    expect(parseMm('')).toBeNull();
    expect(parseMm('abc')).toBeNull();
    expect(PROFILES.map((p) => p.value)).toEqual(['kdp-white', 'kdp-cream', 'kdp-color-premium', 'custom']);
  });
});
