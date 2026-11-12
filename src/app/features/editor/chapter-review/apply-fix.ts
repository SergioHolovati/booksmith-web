import type { Editor } from '@tiptap/core';

import { findQuote } from './find-quote';

/** Uma troca dentro do trecho: de {@code from} a {@code to} (posições no texto antigo) entra {@code insert}. */
export interface TextEdit {
  from: number;
  to: number;
  insert: string;
}

/** Acima disso, a comparação palavra a palavra fica cara; troca o trecho inteiro. */
const MAX_TOKENS = 1500;

/** Palavras, espaços e cada sinal de pontuação viram pedaços separados. */
function tokens(text: string): string[] {
  return text.match(/[\p{L}\p{N}]+|\s+|[^\p{L}\p{N}\s]/gu) ?? [];
}

/**
 * As trocas mínimas para transformar {@code before} em {@code after}, palavra a palavra (maior subsequência
 * comum). Só o que mudou é tocado, então negrito, itálico e comentários no resto do parágrafo ficam como estão.
 */
export function textEdits(before: string, after: string): TextEdit[] {
  if (before === after) {
    return [];
  }
  const a = tokens(before);
  const b = tokens(after);
  if (a.length > MAX_TOKENS || b.length > MAX_TOKENS) {
    return [{ from: 0, to: before.length, insert: after }];
  }
  const lcs = commonTable(a, b);
  const edits: TextEdit[] = [];
  let i = 0;
  let j = 0;
  let pos = 0;
  let current: TextEdit | null = null;
  const flush = () => {
    if (current) {
      edits.push(current);
      current = null;
    }
  };
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      flush();
      pos += a[i].length;
      i++;
      j++;
    } else if (j < b.length && (i === a.length || lcs[i][j + 1] >= lcs[i + 1][j])) {
      current ??= { from: pos, to: pos, insert: '' };
      current.insert += b[j];
      j++;
    } else {
      current ??= { from: pos, to: pos, insert: '' };
      current.to += a[i].length;
      pos += a[i].length;
      i++;
    }
  }
  flush();
  return edits;
}

/** Tabela da maior subsequência comum: {@code t[i][j]} = quantos pedaços em comum de a[i..] e b[j..]. */
function commonTable(a: string[], b: string[]): number[][] {
  const t: number[][] = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      t[i][j] = a[i] === b[j] ? t[i + 1][j + 1] + 1 : Math.max(t[i + 1][j], t[i][j + 1]);
    }
  }
  return t;
}

/**
 * Troca o trecho apontado pela sugestão no editor. Se o trecho é texto corrido (sem menção ou ilustração no
 * meio), aplica só as diferenças; senão, troca o trecho inteiro. Tudo numa transação: um Ctrl+Z desfaz.
 *
 * @return false se o trecho já não está no texto
 */
export function applyFix(editor: Editor, quote: string, suggestion: string, blockId: string | null): boolean {
  const range = findQuote(editor.state.doc, quote, blockId);
  if (!range) {
    return false;
  }
  const tr = editor.state.tr;
  // O texto como está no editor (pode diferir do trecho em maiúsculas); sem nós no meio, posição = caractere
  const actual = editor.state.doc.textBetween(range.from, range.to);
  if (actual.length === range.to - range.from) {
    // Do fim para o começo: as posições de trás não mudam com as trocas da frente
    for (const edit of textEdits(actual, suggestion).reverse()) {
      if (edit.insert) {
        tr.insertText(edit.insert, range.from + edit.from, range.from + edit.to);
      } else {
        tr.delete(range.from + edit.from, range.from + edit.to);
      }
    }
  } else {
    tr.insertText(suggestion, range.from, range.to);
  }
  editor.view.dispatch(tr);
  return true;
}
