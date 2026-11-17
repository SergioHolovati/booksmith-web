import { DEFAULT_PAGE, clampBox, previewTextStyle, textBoxStyle } from './page-designer';

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

  it('texto livre: a caixa onde o autor arrastou, sempre dentro da página', () => {
    const free = { ...DEFAULT_PAGE, text: 'free' as const, x: 20, y: 60, w: 50 };
    expect(textBoxStyle(free, [200, 200])).toMatchObject({ left: '20%', top: '60%', width: '50%' });
    expect(clampBox(95, 150, 40)).toEqual({ x: 60, y: 95, w: 40 });
    expect(clampBox(-5, -5, 5)).toEqual({ x: 0, y: 0, w: 15 });
  });

  it('na dupla, o livre usa o livro aberto inteiro e a letra fica com metade do cqw', () => {
    const spread = { ...DEFAULT_PAGE, spread: true, text: 'free' as const, x: 60, y: 25, w: 30 };
    const style = previewTextStyle(spread, [200, 200]);
    expect(style['left']).toBe('60%');
    expect(parseFloat(style['font-size'])).toBeCloseTo(4.586 / 2, 2);
    // Fixo na dupla: o texto vai para a metade escolhida
    expect(previewTextStyle({ ...DEFAULT_PAGE, spread: true, textSide: 'right' }, [200, 200])['left']).toBe('53%');
  });
});
