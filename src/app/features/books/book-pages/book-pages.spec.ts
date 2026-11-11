import { EMPTY_PAGES, pageCount, toDraft, toPages } from './book-pages';

describe('páginas do livro', () => {
  it('rascunho troca null por texto vazio e volta trocando vazio por null', () => {
    const draft = toDraft({ ...EMPTY_PAGES, dedication: 'Para minha avó.' });
    expect(draft.credits).toBe('');
    expect(draft.dedication).toBe('Para minha avó.');

    const pages = toPages({ ...draft, credits: '   ', aboutAuthor: '  Escreve à noite.\n' });
    expect(pages.credits).toBeNull();
    expect(pages.aboutAuthor).toBe('Escreve à noite.');
    expect(pages.dedication).toBe('Para minha avó.');
  });

  it('livro antigo, sem páginas, abre em branco; o que não é página fica de fora', () => {
    expect(toDraft(undefined)).toEqual(toDraft(EMPTY_PAGES));
    const extra = { ...EMPTY_PAGES, dedication: 'Oi', empty: false } as unknown as Parameters<typeof toDraft>[0];
    expect(Object.keys(toDraft(extra))).toEqual(Object.keys(EMPTY_PAGES));
  });

  it('conta só as páginas com texto', () => {
    expect(pageCount(EMPTY_PAGES)).toBe(0);
    expect(pageCount({ ...EMPTY_PAGES, epigraphSource: 'Alguém', dedication: 'Para você', aboutAuthor: ' ' })).toBe(1);
  });
});
