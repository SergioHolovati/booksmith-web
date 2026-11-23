import { ArtPage, PageMapBlock } from '../../../core/models/api.models';
import { artSlots, canMoveArt, moveArt, moveChapter, newArtPlace, pageRange } from './text-organizer-items';

const art = (id: string, after: string): ArtPage => ({ key: 'illustration', id, after, imageId: 'img', color: null, bleed: false });
const block = (kind: PageMapBlock['kind'], ref: string | null = null): PageMapBlock =>
  ({ kind, ref, title: kind, firstPage: 1, pageCount: 1 });

describe('organização do livro de texto', () => {
  const slots = artSlots(['c1', 'c2']);

  it('os lugares: começo, antes do 1º capítulo, depois de cada um, fim', () => {
    expect(slots).toEqual(['start', 'front', 'c1', 'c2', 'end']);
  });

  it('a ilustração passa pela outra do mesmo lugar, depois vai para o lugar vizinho', () => {
    const arts = [art('a', 'c1'), art('b', 'c1')];
    expect(moveArt(arts, 'a', 1, slots).map((a) => a.id)).toEqual(['b', 'a']);
    // Depois da última do lugar: para o começo do próximo
    const next = moveArt(arts, 'b', 1, slots);
    expect(next.find((a) => a.id === 'b')?.after).toBe('c2');
    // Antes da primeira: para o fim do lugar anterior
    expect(moveArt(arts, 'a', -1, slots).find((a) => a.id === 'a')?.after).toBe('front');
    expect(canMoveArt([art('x', 'start')], 'x', -1, slots)).toBe(false);
    expect(canMoveArt([art('x', 'end')], 'x', 1, slots)).toBe(false);
  });

  it('a ilustração nova entra logo depois do trecho escolhido', () => {
    const arts = [art('a', 'c1')];
    expect(newArtPlace(null, arts, ['c1', 'c2'])).toEqual({ after: 'c2', index: 1 });
    expect(newArtPlace(block('chapter', 'c1'), arts, ['c1', 'c2'])).toEqual({ after: 'c1', index: 0 });
    expect(newArtPlace(block('illustration', 'a'), arts, ['c1', 'c2'])).toEqual({ after: 'c1', index: 1 });
    expect(newArtPlace(block('toc'), arts, ['c1'])).toEqual({ after: 'front', index: 1 });
    expect(newArtPlace(block('title'), arts, ['c1'])).toEqual({ after: 'start', index: 1 });
    expect(newArtPlace(block('back', 'colophon'), arts, ['c1'])).toEqual({ after: 'end', index: 1 });
  });

  it('capítulo muda de lugar com o vizinho; as páginas em intervalo', () => {
    expect(moveChapter(['c1', 'c2', 'c3'], 'c2', -1)).toEqual(['c2', 'c1', 'c3']);
    expect(moveChapter(['c1', 'c2'], 'c2', 1)).toEqual(['c1', 'c2']);
    expect(pageRange({ ...block('chapter'), firstPage: 7, pageCount: 6 })).toBe('págs. 7–12');
    expect(pageRange({ ...block('chapter'), firstPage: 3, pageCount: 1 })).toBe('pág. 3');
  });
});
