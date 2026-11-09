import { countWords } from './word-count';

describe('countWords', () => {
  it('conta como o backend (ManuscriptDocument.countWords)', () => {
    // mesmo caso do ManuscriptDocumentTest: "saiu-se" é uma palavra, "* * *" não conta
    expect(countWords('Capítulo um\nLia ajeitou o cabelo ruivo\ne saiu-se bem.\n* * *')).toBe(10);
  });

  it('aceita acentos, apóstrofos e números', () => {
    expect(countWords("Ação d'água às 3 horas, coração.")).toBe(6);
  });

  it('texto vazio tem zero palavras', () => {
    expect(countWords('   \n ')).toBe(0);
  });
});
