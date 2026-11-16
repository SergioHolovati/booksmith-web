import { printedPages } from './book-detail';

describe('páginas impressas do livro ilustrado', () => {
  it('folha de rosto + páginas; a dupla começa à esquerda (par) e pode pedir uma em branco', () => {
    expect(printedPages([])).toBeNull();
    // 1 rosto, 2 página, 3 em branco, 4-5 dupla
    expect(printedPages([{ page: { spread: false } }, { page: { spread: true } }])).toEqual({ total: 5, blanks: 1, missing: 3 });
    // 1 rosto, 2-3 dupla: sem branco
    expect(printedPages([{ page: { spread: true } }, { page: null }])).toEqual({ total: 4, blanks: 0, missing: 0 });
  });
});
