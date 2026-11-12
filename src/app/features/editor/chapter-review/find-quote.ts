import type { Node as ProseMirrorNode } from '@tiptap/pm/model';

export interface QuoteRange {
  from: number;
  to: number;
}

/**
 * Acha no documento do editor o trecho apontado pela revisão, sem diferença de maiúsculas. Procura primeiro no
 * bloco de id `blockId` (o parágrafo onde a IA leu o trecho); se o texto mudou de lugar, aceita o primeiro
 * bloco que tiver o trecho. Null se o trecho não existe mais (o autor já mexeu ali).
 */
export function findQuote(doc: ProseMirrorNode, quote: string, blockId: string | null): QuoteRange | null {
  if (!quote) {
    return null;
  }
  let inBlock: QuoteRange | null = null;
  let anywhere: QuoteRange | null = null;
  doc.descendants((node, pos) => {
    if (inBlock) {
      return false;
    }
    if (!node.isTextblock) {
      return true;
    }
    const range = rangeIn(node, pos, quote);
    if (range) {
      if (!blockId || node.attrs['id'] === blockId) {
        inBlock = range;
      } else {
        anywhere ??= range;
      }
    }
    return false;
  });
  return inBlock ?? anywhere;
}

/** Posições do trecho dentro de um parágrafo; elementos que não são texto (menções, quebras) não casam. */
function rangeIn(block: ProseMirrorNode, pos: number, quote: string): QuoteRange | null {
  let text = '';
  const positions: number[] = [];
  block.forEach((child, offset) => {
    if (child.isText && child.text) {
      for (let i = 0; i < child.text.length; i++) {
        positions.push(pos + 1 + offset + i);
      }
      text += child.text;
    } else {
      positions.push(-1);
      text += '￼';
    }
  });
  const at = text.toLowerCase().indexOf(quote.toLowerCase());
  if (at < 0) {
    return null;
  }
  const from = positions[at];
  const last = positions[at + quote.length - 1];
  return from >= 0 && last >= 0 ? { from, to: last + 1 } : null;
}
