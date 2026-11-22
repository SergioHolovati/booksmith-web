/**
 * Os modelos das páginas do livro (os mesmos do servidor, Manuscripts.BookPages.TEMPLATE): o que fica entre colchetes
 * é para completar. Linha com colchete não sai no livro, e a conferência para a gráfica avisa.
 */
export const CREDIT_ROLES = [
  { role: 'Edição', hint: 'editora, ou edição independente' },
  { role: 'Revisão', hint: 'nome de quem revisou' },
  { role: 'Ilustração', hint: 'nome de quem ilustrou' },
  { role: 'Capa', hint: 'nome de quem fez a capa' },
  { role: 'Projeto gráfico e diagramação', hint: 'nome' },
] as const;

export const ABOUT_TEMPLATE =
  '[Conte em poucas linhas quem você é: onde vive, o que faz, o que escreve e por que escreveu este livro.]';

export const COLOPHON_TEMPLATE =
  'Este livro foi composto em [fonte] e impresso em [papel] pela [gráfica], em [mês e ano].';

const PLACEHOLDER = /\[[^\]\n]{1,120}\]/;

/** As linhas que ainda têm campo do modelo para completar. */
export function pendingLines(text: string | null | undefined): string[] {
  return (text ?? '').split('\n').map((l) => l.trim()).filter((l) => PLACEHOLDER.test(l));
}

export type PageStatus = 'ok' | 'pending' | 'empty';

/** Pronta (tem texto e nada por completar), por completar (tem colchete) ou vazia. */
export function pageStatus(text: string | null | undefined): PageStatus {
  if (pendingLines(text).length) {
    return 'pending';
  }
  return (text ?? '').trim() ? 'ok' : 'empty';
}

/** O valor de uma função nos créditos ("Revisão: Ana" → "Ana"); campo do modelo ainda por completar = vazio. */
export function creditValue(credits: string, role: string): string {
  const line = credits.split('\n').find((l) => l.trim().toLowerCase().startsWith(role.toLowerCase() + ':'));
  if (!line) {
    return '';
  }
  const value = line.slice(line.indexOf(':') + 1).trim();
  return PLACEHOLDER.test(value) ? '' : value;
}

/**
 * Os créditos com a função preenchida: troca a linha dela (ou acrescenta no fim). Valor vazio volta ao campo do
 * modelo, que não sai no livro.
 */
export function withCredit(credits: string, role: string, value: string, hint: string): string {
  const text = value.trim() ? `${role}: ${value.trim()}` : `${role}: [${hint}]`;
  const lines = credits ? credits.split('\n') : [];
  const index = lines.findIndex((l) => l.trim().toLowerCase().startsWith(role.toLowerCase() + ':'));
  if (index >= 0) {
    lines[index] = text;
  } else {
    lines.push(text);
  }
  return lines.join('\n');
}
