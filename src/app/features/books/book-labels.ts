import { BookGenre, BookKind, BookLanguage, BookStatus } from '../../core/models/api.models';

export const STATUS_LABEL: Record<BookStatus, string> = {
  DRAFT: 'Rascunho',
  WRITING: 'Escrevendo',
  COMPLETE: 'Concluído',
};

export const LANGUAGE_LABEL: Record<BookLanguage, string> = {
  'pt-BR': 'Português (Brasil)',
  'pt-PT': 'Português (Portugal)',
  en: 'Inglês',
  es: 'Espanhol',
};

export const KIND_LABEL: Record<BookKind, string> = {
  ORIGINAL: 'Original',
  FANFIC: 'Fanfic',
};

export const GENRE_LABEL: Record<BookGenre, string> = {
  FICTION: 'Ficção (romance, conto, fanfic)',
  CHILDREN: 'Infantil ilustrado',
  CHRISTIAN: 'Cristão / devocional',
  SELF_HELP: 'Autoajuda',
  SPIRITUAL: 'Espiritualidade',
  EDUCATIONAL: 'Didático',
  OTHER: 'Outro',
};

/** O livro infantil ilustrado: cada capítulo é uma página, com a ilustração de fundo e o texto por cima. */
export function isPictureBook(genre: BookGenre | null | undefined): boolean {
  return genre === 'CHILDREN';
}

/** Personagens e lugares: ficção, infantil (o personagem guia a ilustração) e "outro". */
export function hasCast(genre: BookGenre | null | undefined): boolean {
  return !genre || genre === 'FICTION' || genre === 'CHILDREN' || genre === 'OTHER';
}

/** Linha do tempo e continuidade (furos de enredo): só onde há enredo longo. */
export function hasPlotTools(genre: BookGenre | null | undefined): boolean {
  return !genre || genre === 'FICTION' || genre === 'OTHER';
}
