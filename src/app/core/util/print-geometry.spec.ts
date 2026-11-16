import { dpiHint, printDpi, printGeometry } from './print-geometry';

describe('geometria de impressão', () => {
  const a5 = printGeometry({ trim: 'a5', margins: 'normal' });

  it('A5 com margens normais: texto de 114 × 168 mm', () => {
    expect(a5).toEqual({ pageWidthMm: 148, pageHeightMm: 210, textWidthMm: 114, textHeightMm: 168 });
  });

  it('dá o mesmo DPI que o servidor em cada lugar', () => {
    // Os mesmos números do ExportWritersTest (imagem 2000 × 1500)
    expect(printDpi('small', 2000, 1500, a5, false).widthMm).toBeCloseTo(45.6, 1);
    expect(printDpi('bleed', 2000, 1500, a5, false).dpi).toBe(181);
    expect(printDpi('spread', 2000, 1500, a5, false).dpi).toBe(171);
    expect(printDpi('wide', 2000, 1500, a5, false).dpi).toBe(445);
  });

  it('avisa abaixo de 300 DPI', () => {
    expect(dpiHint(301).ok).toBe(true);
    expect(dpiHint(181)).toEqual({ text: 'Impressão: 181 DPI, pode sair borrada (o ideal é 300)', ok: false });
  });
});
