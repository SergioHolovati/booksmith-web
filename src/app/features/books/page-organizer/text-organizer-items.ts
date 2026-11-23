import { ArtPage, PageMapBlock } from '../../../core/models/api.models';

/**
 * Os lugares de uma página de ilustração no livro de texto, na ordem do livro: 'start' (antes da folha de rosto),
 * 'front' (depois do sumário, antes do primeiro capítulo), depois de cada capítulo e 'end' (no fim do livro).
 */
export function artSlots(chapterIds: readonly string[]): string[] {
  return ['start', 'front', ...chapterIds.map((id) => id.toLowerCase()), 'end'];
}

const same = (a: string | null | undefined, b: string | null | undefined) => (a ?? '').toLowerCase() === (b ?? '').toLowerCase();

/**
 * A página de ilustração {@code id} uma casa antes (-1) ou depois (1): passa pela outra ilustração do mesmo lugar;
 * sem ela, vai para o lugar vizinho (no fim dele, vindo de depois; no começo, vindo de antes).
 */
export function moveArt(arts: readonly ArtPage[], id: string, direction: -1 | 1, slots: readonly string[]): ArtPage[] {
  const index = arts.findIndex((a) => a.id === id);
  if (index < 0) {
    return [...arts];
  }
  const art = arts[index];
  const here = arts.filter((a) => same(a.after, art.after));
  const neighbour = here[here.findIndex((a) => a.id === id) + direction];
  if (neighbour) {
    const result = [...arts];
    const other = result.findIndex((a) => a.id === neighbour.id);
    [result[index], result[other]] = [result[other], result[index]];
    return result;
  }
  const slot = slots.findIndex((s) => same(s, art.after)) + direction;
  if (slot < 0 || slot >= slots.length) {
    return [...arts];
  }
  const moved: ArtPage = { ...art, after: slots[slot] };
  const rest = arts.filter((a) => a.id !== id);
  const first = rest.findIndex((a) => same(a.after, slots[slot]));
  if (direction < 0 || first < 0) {
    return [...rest, moved];
  }
  rest.splice(first, 0, moved);
  return rest;
}

/** Dá para mover a ilustração nessa direção (não está na ponta do livro). */
export function canMoveArt(arts: readonly ArtPage[], id: string, direction: -1 | 1, slots: readonly string[]): boolean {
  const moved = moveArt(arts, id, direction, slots);
  return moved.some((a, i) => a.id !== arts[i]?.id || a.after !== arts[i]?.after);
}

/**
 * Onde entra a página de ilustração nova, pelo trecho escolhido: na capa ou na folha de rosto, no começo; nas da
 * frente e no sumário, antes do primeiro capítulo; num capítulo, logo depois dele; numa ilustração, logo depois dela;
 * nas do fim, no fim. Sem escolha: depois do último capítulo.
 */
export function newArtPlace(block: PageMapBlock | null, arts: readonly ArtPage[], chapterIds: readonly string[]):
  { after: string; index: number } {
  const atEndOf = (after: string) => ({ after, index: arts.length });
  if (!block) {
    return atEndOf(chapterIds.length ? chapterIds[chapterIds.length - 1].toLowerCase() : 'front');
  }
  switch (block.kind) {
    case 'cover':
    case 'title': {
      // Logo antes da folha de rosto: no começo do lugar 'start' se escolheu a capa, no fim dele se a folha de rosto
      const first = arts.findIndex((a) => same(a.after, 'start'));
      return block.kind === 'cover' && first >= 0 ? { after: 'start', index: first } : atEndOf('start');
    }
    case 'front':
    case 'toc':
      return atEndOf('front');
    case 'chapter': {
      const id = (block.ref ?? '').toLowerCase();
      const first = arts.findIndex((a) => same(a.after, id));
      return first >= 0 ? { after: id, index: first } : atEndOf(id);
    }
    case 'illustration': {
      const index = arts.findIndex((a) => a.id === block.ref);
      return index >= 0 ? { after: arts[index].after, index: index + 1 } : atEndOf('end');
    }
    default:
      return atEndOf('end');
  }
}

/** A ordem dos capítulos com {@code id} uma casa antes (-1) ou depois (1). */
export function moveChapter(order: readonly string[], id: string, direction: -1 | 1): string[] {
  const from = order.findIndex((c) => same(c, id));
  const to = from + direction;
  const result = [...order];
  if (from < 0 || to < 0 || to >= order.length) {
    return result;
  }
  [result[from], result[to]] = [result[to], result[from]];
  return result;
}

/** "pág. 7" ou "págs. 7–12". */
export function pageRange(block: PageMapBlock): string {
  const last = block.firstPage + block.pageCount - 1;
  return block.pageCount > 1 ? `págs. ${block.firstPage}–${last}` : `pág. ${block.firstPage}`;
}
