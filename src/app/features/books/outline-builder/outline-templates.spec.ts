import { OUTLINE_TEMPLATES, templatesFor } from './outline-templates';

describe('modelos de estrutura', () => {
  it('devocional de 30 dias: 30 dias, cada um com 4 subcapítulos recuados', () => {
    const lines = OUTLINE_TEMPLATES.find((t) => t.id === 'devocional-30')!.text.split('\n');
    expect(lines.filter((l) => /^Dia \d+$/.test(l))).toHaveLength(30);
    expect(lines.filter((l) => l.startsWith('  '))).toHaveLength(120);
    expect(lines.at(-1)).toBe('Conclusão');
  });

  it('nenhum modelo passa do limite do sumário (400 itens)', () => {
    for (const template of OUTLINE_TEMPLATES) {
      expect(template.text.split('\n').length).toBeLessThanOrEqual(400);
    }
  });

  it('os do gênero do livro vêm primeiro', () => {
    expect(templatesFor('EDUCATIONAL')[0].id).toBe('didatico');
    expect(templatesFor('CHRISTIAN').slice(0, 2).map((t) => t.id)).toEqual(['devocional-30', 'devocional-40']);
    expect(templatesFor(null)).toHaveLength(OUTLINE_TEMPLATES.length);
  });
});
