import { SUPPORT_CATEGORIES, chapterFromRoute } from './support-form';

describe('pedido de suporte', () => {
  it('reconhece o capítulo aberto pela tela de onde a pessoa veio', () => {
    const id = '0196f000-0000-7000-8000-00003f9a2c71';
    expect(chapterFromRoute(`/books/abc/chapters/${id}`)).toBe(id);
    expect(chapterFromRoute('/books/abc')).toBeNull();
  });

  it('"Meu texto sumiu" vem primeiro e cada assunto aparece uma vez', () => {
    expect(SUPPORT_CATEGORIES[0].value).toBe('lost_text');
    expect(new Set(SUPPORT_CATEGORIES.map((c) => c.value)).size).toBe(SUPPORT_CATEGORIES.length);
  });
});
