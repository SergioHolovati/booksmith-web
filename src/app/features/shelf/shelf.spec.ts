import { ChapterSummary } from '../../core/models/api.models';
import { Publication } from '../../core/api/shelf.api';
import { changedSince, parseTags } from './publication';
import { DEFAULT_PREFS, readPrefs, scrollProgress } from './reader-page';
import { toFilter } from './shelf-home';
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
    expect(toFilter('  dragão ', 'fanfic', '12', null)).toEqual({ q: 'dragão', fanfic: true, maxRating: '12', status: undefined });
    expect(toFilter('', 'all', null, 'complete')).toEqual({ q: undefined, fanfic: undefined, maxRating: undefined, status: 'complete' });
  });

  it('mostra o tamanho da obra', () => {
    expect(wordsLabel(850)).toBe('850 palavras');
    expect(wordsLabel(1)).toBe('1 palavra');
    expect(wordsLabel(12400)).toBe('12 mil palavras');
    expect(readingMinutes(50)).toBe(1);
    expect(readingMinutes(2000)).toBe(10);
  });
});
