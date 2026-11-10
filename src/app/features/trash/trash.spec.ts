import { TrashItem, UniverseTrashItem } from '../../core/models/api.models';
import { UNIVERSE_TRASH_KIND, mergeTrash } from './trash';

describe('lixeira', () => {
  it('junta livros, capítulos e o universo, do mais recente ao mais antigo', () => {
    const chapter = { type: 'CHAPTER', id: 'c', title: 'Cap. 3', deletedAt: '2026-11-08T10:00:00Z' } as TrashItem;
    const lia = { type: 'CHARACTER', id: 'l', title: 'Lia', deletedAt: '2026-11-09T09:00:00Z' } as UniverseTrashItem;
    const war = { type: 'EVENT', id: 'w', title: 'A guerra', deletedAt: '2026-11-07T09:00:00Z' } as UniverseTrashItem;

    expect(mergeTrash([chapter], [lia, war]).map((e) => e.item.id)).toEqual(['l', 'c', 'w']);
  });

  it('cada tipo do universo tem rótulo e ícone', () => {
    for (const kind of Object.values(UNIVERSE_TRASH_KIND)) {
      expect(kind.label).toBeTruthy();
      expect(kind.icon).toMatch(/^pi-/);
    }
  });
});
