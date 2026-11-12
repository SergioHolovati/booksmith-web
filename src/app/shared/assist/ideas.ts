import { Suggestion } from '../../core/models/api.models';

/** A ideia como entra no campo: "Título: texto", ou só o texto quando não há título. */
export function ideaText(idea: Suggestion): string {
  return idea.title ? `${idea.title}: ${idea.text}` : idea.text;
}

/**
 * Acrescenta a ideia ao fim do campo, num parágrafo novo. Devolve `null` quando o resultado passaria do
 * limite do campo (a tela avisa e o autor copia e resume).
 */
export function appendIdea(current: string, idea: string, max: number): string | null {
  const before = current.trimEnd();
  const next = before ? `${before}\n\n${idea}` : idea;
  return next.length > max ? null : next;
}
