import { headingsText, rejectReason, isPdf } from './file-import';

describe('importar arquivo', () => {
  it('aceita Word, LibreOffice, texto e Markdown, sem diferenciar maiúsculas', () => {
    for (const name of ['livro.docx', 'livro.ODT', 'notas.txt', 'cap.md', 'cap.markdown']) {
      expect(rejectReason(name)).toBeNull();
    }
  });

  it('explica como converter os formatos que não dá para ler', () => {
    expect(rejectReason('velho.doc')).toContain('Salvar como');
    // O PDF é o livro pronto: não é recusado (vira páginas do livro)
    expect(rejectReason('livro.pdf')).toBeNull();
    expect(isPdf('Livro.PDF')).toBe(true);
    expect(rejectReason('livro.pages')).toContain('Exportar para');
    expect(rejectReason('foto.jpg')).toContain('.odt');
  });

  it('fala dos títulos no vocabulário do programa de origem', () => {
    expect(headingsText('a.docx')).toContain('Word');
    expect(headingsText('a.odt')).toContain('LibreOffice');
    expect(headingsText('a.md')).toContain('Markdown');
    expect(headingsText(undefined)).toBe('Separamos pelos títulos do arquivo.');
  });
});
