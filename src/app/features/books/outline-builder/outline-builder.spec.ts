import { outlineChapters } from './outline-builder';

describe('criar pelo sumário', () => {
  it('conta só capítulos com título (partes e subcapítulos não viram capítulo)', () => {
    expect(outlineChapters([
      { kind: 'part', title: 'Parte 1', match: -1 },
      { kind: 'unnumbered', title: 'Introdução', match: -1 },
      { kind: 'chapter', title: 'Capítulo 1', match: -1 },
      { kind: 'section', title: '1.1 - Início', match: -1 },
      { kind: 'chapter', title: '   ', match: -1 },
    ])).toBe(2);
  });
});
