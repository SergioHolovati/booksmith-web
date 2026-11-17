import { dataUrlBytes, isSpreadImage, naturalOrder, pageTitle } from './illustration-pages';

describe('illustration pages', () => {
  it('ordena os arquivos como as pessoas contam', () => {
    const files = ['10.png', '2.png', 'capa.png', '1.png', 'Pagina 3.jpg'].map((name) => ({ name }));
    expect(naturalOrder(files).map((f) => f.name)).toEqual(['1.png', '2.png', '10.png', 'capa.png', 'Pagina 3.jpg']);
  });

  it('o nome da página é o do arquivo, sem a extensão', () => {
    expect(pageTitle('pagina_03.png')).toBe('pagina 03');
    expect(pageTitle('Hiper eu.final.JPEG')).toBe('Hiper eu.final');
    expect(pageTitle('.png')).toBe('Página');
  });

  it('imagem na proporção do livro aberto vira página dupla', () => {
    expect(isSpreadImage(4000, 2000, 200, 200)).toBe(true); // 2:1 num livro quadrado
    expect(isSpreadImage(2000, 2000, 200, 200)).toBe(false);
    expect(isSpreadImage(2400, 2000, 200, 200)).toBe(false); // um pouco deitada: página simples
    expect(isSpreadImage(2970, 2100, 148, 210)).toBe(true); // A4 deitado num A5 em pé
  });

  it('conta os bytes de um data URL', () => {
    expect(dataUrlBytes('data:image/jpeg;base64,' + 'A'.repeat(8))).toBe(6);
  });
});
