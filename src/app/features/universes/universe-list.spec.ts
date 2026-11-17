import { BookSummary, Universe } from '../../core/models/api.models';
import { deleteUniverseMessage, groupBooks } from './universe-list';

const universe = (id: string, name: string): Universe => ({
  id,
  name,
  premise: null,
  mapUrl: null,
  characterCount: 0,
  placeCount: 0,
  eventCount: 0,
  magicCount: 0,
  lawCount: 0,
  createdAt: '2026-11-09T00:00:00Z',
});
const book = (id: string, universeId: string): BookSummary =>
  ({ id, title: id, universeId }) as BookSummary;

describe('universos', () => {
  it('junta cada universo aos seus livros, séries primeiro', () => {
    const cards = groupBooks(
      [universe('a', 'Avulso'), universe('s', 'Saga do Café'), universe('v', 'Vazio')],
      [book('livro-1', 's'), book('livro-2', 's'), book('conto', 'a')],
    );
    expect(cards.map((c) => [c.universe.name, c.books.map((b) => b.id)])).toEqual([
      ['Saga do Café', ['livro-1', 'livro-2']],
      ['Avulso', ['conto']],
      ['Vazio', []],
    ]);
  });

  it('o alerta da exclusão diz quais livros vão junto para a lixeira', () => {
    expect(deleteUniverseMessage([])).toContain('vai para a lixeira');
    expect(deleteUniverseMessage([{ title: 'Café em Vel' }])).toBe(
      'Atenção: o livro "Café em Vel" está vinculado a ele e vai junto para a lixeira (30 dias). Restaurar um livro traz o universo de volta.',
    );
    const many = deleteUniverseMessage(['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((title) => ({ title })));
    expect(many).toContain('os livros "A", "B", "C", "D", "E" e mais 2 estão vinculados');
  });
});
