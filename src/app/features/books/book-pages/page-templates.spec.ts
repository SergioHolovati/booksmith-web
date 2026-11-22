import { ABOUT_TEMPLATE, creditValue, pageStatus, pendingLines, withCredit } from './page-templates';

describe('modelos das páginas do livro', () => {
  const template = 'Edição: [editora, ou edição independente]\nRevisão: [nome de quem revisou]\n[Cidade], [ano]';

  it('diz o que falta completar', () => {
    expect(pendingLines(template)).toHaveLength(3);
    expect(pageStatus(template)).toBe('pending');
    expect(pageStatus(ABOUT_TEMPLATE)).toBe('pending');
    expect(pageStatus('Para a Ana.')).toBe('ok');
    expect(pageStatus('  ')).toBe('empty');
  });

  it('a ficha técnica preenche a linha da função', () => {
    expect(creditValue(template, 'Revisão')).toBe('');
    const filled = withCredit(template, 'Revisão', 'Ana Lima', 'nome de quem revisou');
    expect(filled).toContain('Revisão: Ana Lima');
    expect(creditValue(filled, 'Revisão')).toBe('Ana Lima');
    expect(pendingLines(filled)).toHaveLength(2);
    // Apagar volta ao campo do modelo (não sai no livro)
    expect(withCredit(filled, 'Revisão', '', 'nome de quem revisou')).toContain('Revisão: [nome de quem revisou]');
    // Função que não estava: entra no fim
    expect(withCredit('Edição: Asinha', 'Capa', 'Giulia', 'x')).toBe('Edição: Asinha\nCapa: Giulia');
  });
});
