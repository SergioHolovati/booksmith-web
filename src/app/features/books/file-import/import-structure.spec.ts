import { ImportDivision, ImportStructure, OutlineItem } from '../../../core/models/api.models';
import { chapterCount, editableOutline, emptyChapters, toRequest } from './import-structure';

function division(index: number, kind: ImportDivision['kind'], title: string): ImportDivision {
  return { index, kind, title, confidence: 'high', reasons: [], words: 10, excerpt: '', inOutline: false };
}

const divisions = [
  division(2, 'unnumbered', 'Apresentação'),
  division(72, 'unnumbered', 'Introdução'),
  division(79, 'chapter', 'Capítulo 1 - Seja cheio do Espírito'),
  division(101, 'section', '1.1 - Natureza divina'),
  division(173, 'chapter', 'Capítulo 2 - Existe um legado'),
];

const outline: OutlineItem[] = [
  { kind: 'part', title: 'PARTE 1', match: -1 },
  { kind: 'unnumbered', title: 'Introdução', match: 72 },
  { kind: 'chapter', title: '1 - Seja cheio do Espírito', match: 79 },
  { kind: 'section', title: '1.1 - Natureza divina', match: 101 },
  { kind: 'chapter', title: '2 - Existe um legado para ser recebido', match: 173 },
  { kind: 'chapter', title: '3 - Deus não entrega o mover', match: -1 },
];

describe('importação: estrutura aprovada', () => {
  it('no sumário, o título do capítulo com texto vem do texto (a versão final)', () => {
    const structure: ImportStructure = {
      documentTitle: null, totalWords: 0, divisions, warnings: [],
      outline: { titled: false, items: outline, withText: 4 },
    };
    const items = editableOutline(structure);
    expect(items[2].title).toBe('Capítulo 1 - Seja cheio do Espírito');
    expect(items[3].title).toBe('1.1 - Natureza divina');
    expect(items[5].title).toBe('3 - Deus não entrega o mover');
  });

  it('conta os capítulos com e sem o sumário como esqueleto', () => {
    expect(chapterCount(divisions, outline, false)).toBe(4);
    // Introdução, cap. 1, 2 e 3 do sumário + Apresentação, que não está no sumário
    expect(chapterCount(divisions, outline, true)).toBe(5);
    expect(emptyChapters(outline)).toBe(1);
  });

  it('o pedido leva as divisões e só manda o sumário quando ele é usado', () => {
    const request = toRequest([division(79, 'chapter', '  Capítulo 1  ')], outline, false);
    expect(request).toEqual({ divisions: [{ index: 79, kind: 'chapter', title: 'Capítulo 1' }], useOutline: false, outline: [] });
    expect(toRequest(divisions, outline, true).outline).toHaveLength(6);
  });
});
