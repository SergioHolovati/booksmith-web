import { ChapterSummary } from '../../core/models/api.models';
import { Publication } from '../../core/api/shelf.api';
import { changedSince, parseTags } from './publication';
import { DEFAULT_PREFS, blockOf, countByBlock, readPrefs, scrollProgress, shortQuote } from './reader-page';
import { parseHiddenTags, toFilter } from './shelf-home';
import { readingMinutes, wordsLabel } from './shelf-labels';

describe('Estante', () => {
  it('lê as tags separadas por vírgula, sem # e sem repetir', () => {
    expect(parseTags('slow burn, Dragões , #magia, , dragões')).toEqual(['slow burn', 'dragões', 'magia']);
    expect(parseTags('')).toEqual([]);
  });

  it('sabe quando o capítulo mudou depois de publicado', () => {
    const chapter = { id: 'c1', updatedAt: '2026-11-25T10:00:00Z' } as ChapterSummary;
    const publication = { chapters: [{ chapterId: 'c1', updatedAt: '2026-11-25T09:00:00Z' }] } as Publication;
    expect(changedSince(chapter, publication)).toBe(true);
    expect(changedSince({ ...chapter, updatedAt: '2026-11-25T08:00:00Z' }, publication)).toBe(false);
    expect(changedSince(chapter, null)).toBe(false);
  });

  it('guarda os ajustes de leitura e volta ao padrão quando estão errados', () => {
    expect(readPrefs(null)).toEqual(DEFAULT_PREFS);
    expect(readPrefs('{"theme":"sepia","size":1.25,"font":"sans"}')).toEqual({ theme: 'sepia', size: 1.25, font: 'sans' });
    expect(readPrefs('{"theme":"neon","size":9}')).toEqual(DEFAULT_PREFS);
    expect(readPrefs('não é json')).toEqual(DEFAULT_PREFS);
  });

  it('calcula quanto do capítulo já foi lido', () => {
    expect(scrollProgress(0, 2000, 800)).toBe(0);
    expect(scrollProgress(600, 2000, 800)).toBe(0.5);
    expect(scrollProgress(5000, 2000, 800)).toBe(1);
    // Capítulo que cabe na tela: lido
    expect(scrollProgress(0, 500, 800)).toBe(1);
  });

  it('monta os filtros da vitrine', () => {
    expect(toFilter({ query: '  dragão ', kind: 'fanfic', maxRating: '12', status: null })).toEqual({
      q: 'dragão', fanfic: true, maxRating: '12', status: undefined, tag: undefined, excludeTags: undefined, sort: undefined,
    });
    expect(toFilter({ query: '', kind: 'all', maxRating: null, status: 'complete', tag: 'magia', hiddenTags: ['morte'], sort: 'popular' }))
      .toEqual({ q: undefined, fanfic: undefined, maxRating: undefined, status: 'complete', tag: 'magia', excludeTags: ['morte'], sort: 'popular' });
  });

  it('lê as tags para esconder', () => {
    expect(parseHiddenTags('Spoiler, morte  ,#incesto, spoiler,')).toEqual(['spoiler', 'morte', 'incesto']);
    expect(parseHiddenTags('')).toEqual([]);
  });

  it('mostra o tamanho da obra', () => {
    expect(wordsLabel(850)).toBe('850 palavras');
    expect(wordsLabel(1)).toBe('1 palavra');
    expect(wordsLabel(12400)).toBe('12 mil palavras');
    expect(readingMinutes(50)).toBe(1);
    expect(readingMinutes(2000)).toBe(10);
  });
  it('conta os comentários de cada parágrafo e cita o começo do trecho', () => {
    const counts = countByBlock([{ blockId: 'b1' }, { blockId: null }, { blockId: 'b1' }, { blockId: 'b2' }]);
    expect(counts.get('b1')).toBe(2);
    expect(counts.get('b2')).toBe(1);
    expect(counts.size).toBe(2);
    expect(shortQuote('  Era   uma vez. ')).toBe('Era uma vez.');
    expect(shortQuote('a'.repeat(120))).toHaveLength(80);
    const p = document.createElement('p');
    p.className = 'indent blk blk-b_x1';
    expect(blockOf(p)).toBe('b_x1');
    expect(blockOf(document.createElement('p'))).toBeNull();
  });
});
