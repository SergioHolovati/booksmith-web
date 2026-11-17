import { BOOK_FONTS, bookFont, fontFamilyCss, loadBookFonts } from './book-fonts';

describe('book fonts', () => {
  it('são as mesmas do servidor, com a Literata como padrão', () => {
    expect(BOOK_FONTS.map((f) => f.id)).toEqual(['literata', 'lora', 'eb-garamond', 'merriweather', 'atkinson',
      'lexend', 'andika', 'nunito', 'fredoka', 'baloo', 'patrick-hand', 'comic-neue']);
    expect(bookFont(null).id).toBe('literata');
    expect(bookFont('desconhecida').id).toBe('literata');
    expect(fontFamilyCss('patrick-hand')).toBe("'Patrick Hand', cursive");
  });

  it('carrega cada família uma vez só, num pedido ao Google Fonts', () => {
    const doc = document.implementation.createHTMLDocument('t');
    loadBookFonts(['nunito', 'andika', 'literata', 'nunito'], doc);
    loadBookFonts(['nunito'], doc);
    const links = doc.head.querySelectorAll('link');
    expect(links.length).toBe(1);
    expect(links[0].getAttribute('href')).toContain('family=Nunito:');
    expect(links[0].getAttribute('href')).toContain('family=Andika:');
    expect(links[0].getAttribute('href')).not.toContain('Literata');
  });
});
