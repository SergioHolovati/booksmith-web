import { filenameOf } from '../../../core/api/export.api';
import { fileSize } from './book-export';

describe('baixar o livro', () => {
  it('lê o nome do arquivo do Content-Disposition, preferindo o UTF-8', () => {
    expect(filenameOf(`attachment; filename="a-conversao.epub"; filename*=UTF-8''a-convers%C3%A3o.epub`)).toBe(
      'a-conversão.epub',
    );
    expect(filenameOf('attachment; filename="livro.pdf"')).toBe('livro.pdf');
    expect(filenameOf(null)).toBeNull();
  });

  it('mostra o tamanho do arquivo de um jeito legível', () => {
    expect(fileSize(300)).toBe('1 KB');
    expect(fileSize(84 * 1024)).toBe('84 KB');
    expect(fileSize(1.25 * 1024 * 1024)).toBe('1,3 MB');
  });
});
