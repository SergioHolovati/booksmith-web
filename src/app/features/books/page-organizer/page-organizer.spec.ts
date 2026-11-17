import { moveItem } from './page-organizer';

describe('moveItem', () => {
  it('leva a página para o novo lugar e as outras andam uma casa', () => {
    expect(moveItem(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd']);
    expect(moveItem(['a', 'b', 'c', 'd'], 3, 1)).toEqual(['a', 'd', 'b', 'c']);
    expect(moveItem(['a', 'b'], 1, 0)).toEqual(['b', 'a']);
  });

  it('fora da lista, nada muda', () => {
    expect(moveItem(['a', 'b'], 0, 5)).toEqual(['a', 'b']);
    expect(moveItem(['a', 'b'], -1, 0)).toEqual(['a', 'b']);
  });
});
