import { previewPages, previewSteps } from './book-preview';

describe('prévia do livro', () => {
  it('no livro aberto, a primeira sozinha e depois os pares', () => {
    expect(previewPages(0, 7, true)).toEqual([1]);
    expect(previewPages(1, 7, true)).toEqual([2, 3]);
    expect(previewPages(3, 7, true)).toEqual([6, 7]);
    expect(previewPages(3, 6, true)).toEqual([6]);
    expect(previewSteps(7, true)).toBe(4);
    expect(previewSteps(6, true)).toBe(4);
  });

  it('no celular, uma página por vez', () => {
    expect(previewPages(0, 3, false)).toEqual([1]);
    expect(previewPages(2, 3, false)).toEqual([3]);
    expect(previewSteps(3, false)).toBe(3);
  });
});
