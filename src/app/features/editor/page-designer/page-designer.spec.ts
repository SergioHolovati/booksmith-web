import { DEFAULT_PAGE, textBoxStyle } from './page-designer';

describe('desenho da página do livro ilustrado', () => {
  it('a caixa de texto fica na área segura (12 mm do corte) e a letra é proporcional à página', () => {
    const style = textBoxStyle(DEFAULT_PAGE, [200, 200]);
    expect(style['left']).toBe('6%');
    expect(style['width']).toBe('88%');
    expect(style['bottom']).toBe('6.5%');
    // 26 pt = 9,17 mm, em 200 mm de página: 4,59% da largura
    expect(parseFloat(style['font-size'])).toBeCloseTo(4.586, 2);
    expect(style['font-size']).toMatch(/cqw$/);
  });

  it('em cima e no meio', () => {
    expect(textBoxStyle({ ...DEFAULT_PAGE, text: 'top' }, [200, 150])['top']).toBe('8%');
    const middle = textBoxStyle({ ...DEFAULT_PAGE, text: 'middle', align: 'left' }, [200, 200]);
    expect(middle['top']).toBe('50%');
    expect(middle['transform']).toBe('translateY(-50%)');
    expect(middle['text-align']).toBe('left');
  });
});
