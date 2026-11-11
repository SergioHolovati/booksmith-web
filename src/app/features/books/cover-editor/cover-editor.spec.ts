import { wrapText } from './cover-canvas';
import { BACKGROUNDS, initialDesign, isLight, TEXT_COLORS } from './cover-editor';

describe('editor de capa', () => {
  // Cada letra mede 10: a conta fica fácil de conferir
  const measure = (text: string) => text.length * 10;

  it('quebra o título em linhas que cabem', () => {
    expect(wrapText(measure, 'A Última Maga do Norte', 100)).toEqual(['A Última', 'Maga do', 'Norte']);
    expect(wrapText(measure, '  Curto  ', 100)).toEqual(['Curto']);
    // palavra maior que a linha fica sozinha, sem sumir
    expect(wrapText(measure, 'Inconstitucionalissimamente', 100)).toEqual(['Inconstitucionalissimamente']);
  });

  it('reconhece fundo claro e escuro', () => {
    expect(isLight('#f4f1ea')).toBe(true);
    expect(isLight('#1f2a44')).toBe(false);
    expect(BACKGROUNDS.every((c) => /^#[0-9a-f]{6}$/.test(c))).toBe(true);
    expect(TEXT_COLORS).toContain('#ffffff');
  });

  it('o desenho inicial usa o título do livro e o nome de quem escreve', () => {
    const design = initialDesign('Café em Vel', 'Lia Moreno');
    expect(design.title).toBe('Café em Vel');
    expect(design.author).toBe('Lia Moreno');
    expect(design.imageId).toBeNull();
  });
});
