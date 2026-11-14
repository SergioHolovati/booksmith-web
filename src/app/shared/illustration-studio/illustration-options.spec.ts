import { DEFAULT_STYLE, nextSlot, saveStyle, savedStyle } from './illustration-options';

describe('estúdio visual: opções', () => {
  beforeEach(() => localStorage.clear());

  it('sem estilo guardado, usa o padrão', () => {
    expect(savedStyle('u1')).toEqual(DEFAULT_STYLE);
  });

  it('guarda o estilo por universo, para as ilustrações saírem coerentes', () => {
    saveStyle('u1', { art: 'ink', color: false, palette: 'cool', detail: 'rich', background: 'white' });
    expect(savedStyle('u1')).toEqual({ art: 'ink', color: false, palette: 'cool', detail: 'rich', background: 'white' });
    expect(savedStyle('u2')).toEqual(DEFAULT_STYLE);
  });

  it('ignora valores que o servidor não conhece', () => {
    localStorage.setItem('booksmith.illustration-style.u1', JSON.stringify({ art: 'fotografia', color: 'sim' }));
    expect(savedStyle('u1')).toEqual(DEFAULT_STYLE);
  });

  it('explica quando volta a ter vaga', () => {
    expect(nextSlot(null)).toBe('');
    expect(nextSlot('2026-11-17T17:00:00Z')).toMatch(/^Volta a ter vaga em \d{2}\/\d{2} às \d{2}:\d{2}\.$/);
  });
});
