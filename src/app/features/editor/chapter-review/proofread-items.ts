import { ProofreadBlock, ReviewItem } from '../../../core/models/api.models';
import { BlockText, placeIssues } from '../proofread/proofread';

/** Quantas palavras de cada lado o trecho pode ganhar até ficar único no parágrafo. */
const MAX_CONTEXT = 3;

/**
 * Os erros do corretor sem IA (LanguageTool, o mesmo que sublinha no editor) como apontamentos da revisão. Fica
 * só ortografia e gramática (o "estilo" do corretor é ruído para quem escreve ficção). Com sugestão, vira
 * "Corrigir": o trecho ganha palavras vizinhas até ser único no parágrafo, para a troca cair no lugar certo.
 */
export function proofreadItems(blocks: BlockText[], results: ProofreadBlock[]): ReviewItem[] {
  const items: ReviewItem[] = [];
  for (const result of results) {
    const block = blocks.find((b) => b.id === result.id);
    if (!block) {
      continue;
    }
    const issues = result.issues.filter((i) => i.type !== 'style');
    // placeIssues descarta o que encosta numa menção ou quebra de linha (não dá para trocar com segurança)
    for (const issue of placeIssues(block, issues)) {
      const [start, end] = uniqueRange(block.text, issue.offset, issue.offset + issue.length);
      const quote = block.text.slice(start, end);
      const replacement = issue.replacements[0];
      const fixed = replacement === undefined
        ? ''
        : block.text.slice(start, issue.offset) + replacement + block.text.slice(issue.offset + issue.length, end);
      items.push({
        blockId: block.id,
        quote,
        problem: issue.message,
        suggestion: fixed,
        fix: replacement !== undefined && fixed !== quote,
        kind: issue.type,
      });
    }
  }
  return items;
}

/** Abre o trecho palavra a palavra (dos dois lados) até ele aparecer uma vez só no parágrafo. */
export function uniqueRange(text: string, from: number, to: number): [number, number] {
  let start = from;
  let end = to;
  for (let step = 0; step < MAX_CONTEXT && occurrences(text, text.slice(start, end)) > 1; step++) {
    start = previousWord(text, start);
    end = nextWord(text, end);
  }
  return [start, end];
}

function occurrences(text: string, part: string): number {
  const lower = text.toLowerCase();
  const target = part.toLowerCase();
  let count = 0;
  for (let at = lower.indexOf(target); at >= 0; at = lower.indexOf(target, at + 1)) {
    count++;
  }
  return count;
}

/** O começo da palavra anterior (ou o começo do parágrafo). */
function previousWord(text: string, from: number): number {
  let i = from;
  while (i > 0 && /\s/.test(text[i - 1])) {
    i--;
  }
  while (i > 0 && !/\s/.test(text[i - 1])) {
    i--;
  }
  return i;
}

/** O fim da próxima palavra (ou o fim do parágrafo). */
function nextWord(text: string, to: number): number {
  let i = to;
  while (i < text.length && /\s/.test(text[i])) {
    i++;
  }
  while (i < text.length && !/\s/.test(text[i])) {
    i++;
  }
  return i;
}
