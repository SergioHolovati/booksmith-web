import { BookLayout, BookPages, ExtraPage, ExtraPageKey, PagePreview } from '../../../core/models/api.models';
import { printable } from '../book-pages/book-pages';

/** Um item da organização: uma página da história ou uma página que o Booksmith gera. */
export type OrganizerItem =
  | { kind: 'story'; id: string; page: PagePreview }
  | { kind: 'extra'; id: string; extra: ExtraPage };

export const EXTRA_TITLES: Record<ExtraPageKey, string> = {
  cover: 'Folha de rosto',
  credits: 'Créditos',
  title: 'Página de rosto',
  dedication: 'Dedicatória',
  epigraph: 'Epígrafe',
  acknowledgments: 'Agradecimentos',
  about: 'Sobre o autor',
  colophon: 'Colofão',
};

/**
 * A lista na ordem do livro: as geradas do começo ('start'), cada página da história seguida das que o autor pôs
 * depois dela, e as do fim ('end'). Lugar de uma página que já saiu do livro vale como o fim.
 */
export function buildItems(pages: readonly PagePreview[], extras: readonly ExtraPage[]): OrganizerItem[] {
  const ids = new Set(pages.map((p) => p.id.toLowerCase()));
  const at = (place: string): OrganizerItem[] =>
    extras
      .filter((e) => (e.after ?? 'start').toLowerCase() === place
        || (place === 'end' && e.after && e.after !== 'start' && !ids.has(e.after.toLowerCase())))
      .map((extra) => ({ kind: 'extra', id: 'extra:' + extra.key, extra }));
  const items: OrganizerItem[] = [...at('start')];
  for (const page of pages) {
    items.push({ kind: 'story', id: page.id, page });
    items.push(...at(page.id.toLowerCase()));
  }
  items.push(...at('end'));
  return items;
}

/**
 * O lugar de cada página gerada, pela posição na lista: antes da primeira página da história = 'start'; depois da
 * última = 'end' (fica no fim mesmo com página nova); no meio = o id da página que vem antes.
 */
export function placedExtras(items: readonly OrganizerItem[]): ExtraPage[] {
  const lastStory = items.map((i) => i.kind).lastIndexOf('story');
  let before: string | null = null;
  const result: ExtraPage[] = [];
  items.forEach((item, index) => {
    if (item.kind === 'story') {
      before = item.page.id;
    } else {
      const after = before === null ? 'start' : index > lastStory ? 'end' : before;
      result.push({ ...item.extra, after });
    }
  });
  return result;
}

/** O fundo da miniatura: o próprio da página; sem ele, o das páginas geradas na diagramação. */
export function extraBackground(extra: ExtraPage, layout: BookLayout | null | undefined): { color: string; imageId: string | null } {
  return {
    color: extra.color ?? layout?.pagesColor ?? '#ffffff',
    imageId: extra.imageId ?? (extra.color ? null : (layout?.pagesImageId ?? null)),
  };
}

/** Umas linhas do texto da página, para a miniatura (o título e o autor nas de rosto). */
export function extraLines(key: ExtraPageKey, pages: BookPages | null | undefined, title: string, author: string): string[] {
  const lines = (text: string | null | undefined) => printable(text).split('\n').map((l) => l.trim()).filter(Boolean);
  switch (key) {
    case 'cover':
    case 'title':
      return [title, author];
    case 'credits':
      return [`© ${author}`, ...lines(pages?.credits)].slice(0, 4);
    case 'dedication':
      return lines(pages?.dedication).slice(0, 3);
    case 'epigraph':
      return lines(pages?.epigraph).slice(0, 3);
    case 'acknowledgments':
      return ['Agradecimentos', ...lines(pages?.acknowledgments)].slice(0, 3);
    case 'about':
      return [pages?.aboutAuthorTitle || 'Sobre o autor', ...lines(pages?.aboutAuthor)].slice(0, 3);
    case 'colophon':
      return lines(pages?.colophon).slice(0, 3);
  }
}
