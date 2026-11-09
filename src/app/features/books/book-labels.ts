import { BookKind, BookLanguage, BookStatus } from '../../core/models/api.models';

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
