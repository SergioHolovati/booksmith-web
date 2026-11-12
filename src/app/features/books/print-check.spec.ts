import { PrintCheckIllustration } from '../../core/models/api.models';
import { printCheckSummary } from './print-check';
import { guideSections } from './publish-guide/publish-guide-steps';
import { BookDetail, Publishing } from '../../core/models/api.models';

function ill(over: Partial<PrintCheckIllustration> = {}): PrintCheckIllustration {
  return {
    imageId: 'i', chapter: 'O mapa', caption: 'O mapa de Vel', widthPx: 3000, heightPx: 2000, widthMm: 114,
    heightMm: 76, dpi: 668, printable: true, minWidthPx: 1347, ok: true, ...over,
  };
}

const low = ill({ dpi: 96, minWidthPx: 1250, ok: false });

describe('ilustrações para impressão', () => {
  it('sem problema, sem aviso', () => {
    expect(printCheckSummary([])).toBeNull();
    expect(printCheckSummary([ill()])).toBeNull();
  });

  it('diz quantas saem borradas e o tamanho que resolve', () => {
    const text = printCheckSummary([ill(), low])!;
    expect(text).toContain('1 ilustração pode sair borrada');
    expect(text).toContain('"O mapa de Vel" (O mapa) sai com 96 DPI');
    expect(text).toContain('1.250 px de largura');
  });

  it('WebP não entra no PDF; sem legenda, fala do capítulo; mais de 3 vira "e mais"', () => {
    const webp = ill({ printable: false, ok: false, caption: '', chapter: 'A torre' });
    expect(printCheckSummary([webp])).toContain('a ilustração de A torre está em WebP');
    const many = printCheckSummary([low, low, low, low, low, ill()])!;
    expect(many).toContain('5 de 6 ilustrações');
    expect(many).toContain('E mais 2.');
  });

  it('no guia: item só com ilustração no texto; aviso quando alguma sai borrada', () => {
    const book = { id: 'b', synopsis: 's', kind: 'ORIGINAL', chapters: [], pages: {}, layout: { trim: 'a5' }, coverUrl: null } as unknown as BookDetail;
    const publishing: Publishing = { destination: 'kdp', isbnPrint: null, isbnEbook: null, keywords: [], done: [] };
    const items = (list: PrintCheckIllustration[] | null) =>
      guideSections(book, publishing, 100, list).flatMap((s) => s.items).filter((i) => i.key === 'illustrations');

    expect(items([])).toEqual([]);
    expect(items(null)[0].status).toBe('info');
    expect(items([ill()])[0]).toMatchObject({ status: 'ok', title: 'Ilustrações' });
    expect(items([ill(), low])[0].status).toBe('warn');
  });
});
