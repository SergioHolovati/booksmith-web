import { BookDetail, Publishing } from '../../../core/models/api.models';
import { EMPTY_PUBLISHING, GuideItem, guideSections, isbnProblem, normalizePublishing, progress } from './publish-guide-steps';

function book(over: Partial<BookDetail> = {}): BookDetail {
  return {
    id: 'b1',
    title: 'A conversão',
    synopsis: 'Uma história.',
    kind: 'ORIGINAL',
    chapters: [{ id: 'c1', title: '1', position: 0, wordCount: 1200, version: 1, updatedAt: '', partTitle: null }],
    pages: { aboutAuthor: null },
    layout: { trim: '16x23' },
    coverUrl: null,
    ...over,
  } as unknown as BookDetail;
}

function item(sections: ReturnType<typeof guideSections>, key: string): GuideItem {
  const found = sections.flatMap((s) => s.items).find((i) => i.key === key);
  if (!found) {
    throw new Error('sem o item ' + key);
  }
  return found;
}

const kdp: Publishing = { ...EMPTY_PUBLISHING, destination: 'kdp' };

describe('guia de publicação', () => {
  it('confere o ISBN como o servidor: 13 números, 978/979 e o último dígito', () => {
    expect(isbnProblem('978-65-00-12345-6')).toBeNull();
    expect(isbnProblem('ISBN 978 65 00 12345 6')).toBeNull();
    expect(isbnProblem('')).toBeNull();
    expect(isbnProblem('978-65-00-12345-5')).toContain('último número');
    expect(isbnProblem('978-65-00-1234')).toContain('13 números');
    expect(isbnProblem('123-65-00-12345-6')).toContain('978 ou 979');
    expect(isbnProblem('978-65-00-1234a-6')).toContain('números e hífens');
  });

  it('no KDP, avisa o tamanho que ele não imprime, poucas páginas e descrição longa', () => {
    const sections = guideSections(book({ synopsis: 'x'.repeat(4001) }), kdp, 20);

    expect(item(sections, 'layout').status).toBe('warn');
    expect(item(sections, 'layout').detail).toContain('A5 ou 6×9');
    expect(item(sections, 'pages')).toMatchObject({ status: 'warn', title: '20 páginas' });
    expect(item(sections, 'synopsis').status).toBe('warn');

    const ok = guideSections(book({ layout: { trim: '6x9' } as BookDetail['layout'] }), kdp, 120);
    expect(item(ok, 'layout').status).toBe('ok');
    expect(item(ok, 'pages').status).toBe('ok');
    expect(item(ok, 'synopsis').status).toBe('ok');
  });

  it('fora do KDP, o tamanho fica para conferir com a plataforma', () => {
    const sections = guideSections(book(), { ...EMPTY_PUBLISHING, destination: 'uiclap' }, 20);
    expect(item(sections, 'layout')).toMatchObject({ status: 'info' });
    expect(item(sections, 'layout').detail).toContain('UICLAP imprime em 16×23');
    expect(item(sections, 'pages').status).toBe('ok');
    expect(sections.flatMap((s) => s.items).some((i) => i.key === 'isbn-kdp')).toBe(false);
  });

  it('o ISBN conta como feito com o número ou, no KDP, com o ISBN grátis marcado', () => {
    expect(item(guideSections(book(), kdp, 100), 'isbn').status).toBe('todo');
    expect(item(guideSections(book(), { ...kdp, done: ['isbn-kdp'] }, 100), 'isbn').status).toBe('ok');
    expect(item(guideSections(book(), { ...kdp, isbnPrint: '978-65-00-12345-6' }, 100), 'isbn').status).toBe('ok');
  });

  it('os passos marcados contam no progresso; o que é só informação não', () => {
    const before = progress(guideSections(book(), kdp, 100));
    const after = progress(guideSections(book(), { ...kdp, done: ['ficha', 'deposito'], keywords: ['fantasia'] }, 100));

    expect(after.total).toBe(before.total);
    expect(after.done).toBe(before.done + 3);
    expect(item(guideSections(book(), kdp, null), 'pages')).toMatchObject({ status: 'info', title: 'Contando as páginas…' });
  });

  it('livro antigo, sem guia guardado, vem com as listas vazias', () => {
    expect(normalizePublishing({} as Publishing)).toEqual(EMPTY_PUBLISHING);
    expect(normalizePublishing(null)).toEqual(EMPTY_PUBLISHING);
  });
});
