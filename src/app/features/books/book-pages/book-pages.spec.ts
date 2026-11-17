import { EMPTY_PAGES, catalogCardTemplate, pageCount, toDraft, toPages } from './book-pages';

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
    expect(Object.keys(toDraft(extra)).sort()).toEqual(Object.keys(EMPTY_PAGES).sort());
  });

  it('conta só as páginas com texto', () => {
    expect(pageCount(EMPTY_PAGES)).toBe(0);
    expect(pageCount({ ...EMPTY_PAGES, epigraphSource: 'Alguém', dedication: 'Para você', aboutAuthor: ' ' })).toBe(1);
  });

  it('falsa folha de rosto, ficha, colofão e foto vão e voltam', () => {
    const draft = toDraft({ ...EMPTY_PAGES, halfTitle: true, authorPhotoId: 'f0' });
    expect(draft.halfTitle).toBe(true);
    expect(draft.authorPhotoId).toBe('f0');
    const pages = toPages({ ...draft, catalogCard: ' CIP \n', colophon: '' });
    expect(pages).toMatchObject({ halfTitle: true, catalogCard: 'CIP', colophon: null, authorPhotoId: 'f0' });
    // Sem foto, vai null (a foto sai)
    expect(toPages({ ...draft, authorPhotoId: '' }).authorPhotoId).toBeNull();
    expect(pageCount({ ...EMPTY_PAGES, halfTitle: true, catalogCard: 'CIP', colophon: 'Fim' })).toBe(3);
  });

  it('o modelo de ficha catalográfica tem o título, o autor e o ano', () => {
    const card = catalogCardTemplate('Hiper… eu?!', 'Ana Lima', 2026);
    expect(card).toContain('Catalogação na Publicação (CIP)');
    expect(card).toContain('Hiper… eu?! / Ana Lima. – 1. ed. – [Cidade]: [Editora], 2026.');
    expect(card).toContain('CRB-');
  });
});
