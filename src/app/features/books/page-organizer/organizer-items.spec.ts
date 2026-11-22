import { ExtraPage, PagePreview } from '../../../core/models/api.models';
import { buildItems, extraBackground, placedExtras } from './organizer-items';
import { moveItem } from './page-organizer';

const page = (id: string): PagePreview => ({ id, title: id, page: {} as PagePreview['page'], paragraphs: [] });
const extra = (key: ExtraPage['key'], after: string | null, color: string | null = null): ExtraPage =>
  ({ key, after, imageId: null, color });

describe('organização das páginas geradas', () => {
  const pages = [page('p1'), page('p2')];
  const extras = [extra('cover', 'start'), extra('dedication', 'p1'), extra('colophon', 'end')];

  it('monta a lista na ordem do livro', () => {
    expect(buildItems(pages, extras).map((i) => i.id)).toEqual(['extra:cover', 'p1', 'extra:dedication', 'p2', 'extra:colophon']);
  });

  it('depois de uma página que saiu do livro, vai para o fim', () => {
    expect(buildItems(pages, [extra('dedication', 'sumiu')]).map((i) => i.id)).toEqual(['p1', 'p2', 'extra:dedication']);
  });

  it('o lugar vem da posição: começo, depois de uma página, fim', () => {
    const items = buildItems(pages, extras);
    // a dedicatória vai para o começo; o colofão para depois da página 1
    const moved = moveItem(moveItem(items, 2, 0), 4, 3);
    expect(moved.map((i) => i.id)).toEqual(['extra:dedication', 'extra:cover', 'p1', 'extra:colophon', 'p2']);
    expect(placedExtras(moved).map((e) => [e.key, e.after])).toEqual([
      ['dedication', 'start'], ['cover', 'start'], ['colophon', 'p1'],
    ]);
    // depois da última página da história = o fim
    expect(placedExtras(moveItem(items, 2, 4)).find((e) => e.key === 'dedication')?.after).toBe('end');
  });

  it('o fundo: o da página, senão o da diagramação', () => {
    const layout = { pagesColor: '#eeeeee', pagesImageId: 'img' } as never;
    expect(extraBackground(extra('credits', 'start'), layout)).toEqual({ color: '#eeeeee', imageId: 'img' });
    expect(extraBackground(extra('credits', 'start', '#123456'), layout)).toEqual({ color: '#123456', imageId: null });
    expect(extraBackground({ ...extra('credits', 'start'), imageId: 'own' }, layout).imageId).toBe('own');
  });
});
