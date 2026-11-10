import { HELP_ARTICLES, HELP_TOPICS, richParts, searchHelp } from './help-articles';

describe('central de ajuda', () => {
  it('acha "meu texto sumiu" mesmo sem acento e com outras palavras', () => {
    expect(searchHelp('perdi meu capitulo')[0].slug).toBe('texto-sumiu');
    expect(searchHelp('sumiu')[0].slug).toBe('texto-sumiu');
    expect(searchHelp('xyzzy')).toEqual([]);
    expect(searchHelp('VERSAO antiga')[0].slug).toBe('versoes');
  });

  it('busca vazia mostra tudo', () => {
    expect(searchHelp('  ')).toHaveLength(HELP_ARTICLES.length);
  });

  it('cada artigo tem slug único, tema conhecido e texto', () => {
    const slugs = new Set(HELP_ARTICLES.map((a) => a.slug));
    expect(slugs.size).toBe(HELP_ARTICLES.length);
    for (const article of HELP_ARTICLES) {
      expect(HELP_TOPICS[article.topic]).toBeTruthy();
      expect(article.body.length).toBeGreaterThan(0);
    }
  });

  it('separa o negrito sem HTML', () => {
    expect(richParts('Toque em **Restaurar** agora')).toEqual([
      { text: 'Toque em ', bold: false },
      { text: 'Restaurar', bold: true },
      { text: ' agora', bold: false },
    ]);
  });
});
