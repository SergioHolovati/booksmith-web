import type { Node as PMNode } from '@tiptap/pm/model';
import { Plugin, PluginKey, type EditorState } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { Extension } from '@tiptap/core';

import { ProofreadIssue } from '../../../core/models/api.models';

/** Trecho de texto de um parágrafo e onde ele está no documento. Menção e quebra de linha não são "texto". */
interface Segment {
  textStart: number;
  textEnd: number;
  docPos: number;
  isText: boolean;
  /** Trecho marcado "não revisar" (fala de personagem que fala errado). */
  skip: boolean;
}

/** Um parágrafo (ou título) como o corretor vê: o id do bloco, o texto puro e o mapa de volta para o documento. */
export interface BlockText {
  id: string;
  text: string;
  segments: Segment[];
}

/** Erro já posicionado no documento, pronto para virar sublinhado. */
export interface PlacedIssue extends ProofreadIssue {
  blockId: string;
  from: number;
  to: number;
  /** O trecho marcado ("muinto"). */
  word: string;
}

/**
 * Texto de cada bloco com id, na ordem do documento. A menção entra com o nome (o corretor vê "Lia chegou") e a
 * quebra de linha como "\n"; os dois ficam marcados como não-texto, para nenhum erro cair em cima deles.
 */
export function blockTexts(doc: PMNode): BlockText[] {
  const blocks: BlockText[] = [];
  doc.descendants((node, pos) => {
    if (!node.isTextblock) {
      return true;
    }
    const id = node.attrs['id'] as string | undefined;
    if (!id) {
      return false;
    }
    let text = '';
    const segments: Segment[] = [];
    node.forEach((child, offset) => {
      const docPos = pos + 1 + offset;
      const piece = child.isText ? (child.text ?? '') : child.type.name === 'mention' ? String(child.attrs['label'] ?? '') : '\n';
      const skip = child.marks.some((m) => m.type.name === 'proofreadOff');
      segments.push({ textStart: text.length, textEnd: text.length + piece.length, docPos, isText: child.isText, skip });
      text += piece;
    });
    blocks.push({ id, text, segments });
    return false;
  });
  return blocks;
}

/** Posição no documento de um ponto do texto do bloco, ou null se cair numa menção ou quebra de linha. */
function docPosition(block: BlockText, textOffset: number, isEnd: boolean): number | null {
  for (const s of block.segments) {
    const inside = isEnd ? textOffset > s.textStart && textOffset <= s.textEnd : textOffset >= s.textStart && textOffset < s.textEnd;
    if (inside) {
      return s.isText ? s.docPos + (textOffset - s.textStart) : null;
    }
  }
  return null;
}

/** Leva os erros de um bloco para posições do documento. Erro que toca menção ou quebra de linha é descartado. */
export function placeIssues(block: BlockText, issues: ProofreadIssue[]): PlacedIssue[] {
  const placed: PlacedIssue[] = [];
  for (const issue of issues) {
    if (issue.length <= 0 || issue.offset + issue.length > block.text.length) {
      continue;
    }
    const from = docPosition(block, issue.offset, false);
    const to = docPosition(block, issue.offset + issue.length, true);
    const end = issue.offset + issue.length;
    const crossesNonText = block.segments.some((s) => !s.isText && s.textStart < end && s.textEnd > issue.offset);
    const insideNoProofread = block.segments.some((s) => s.skip && s.textStart < end && s.textEnd > issue.offset);
    if (from === null || to === null || crossesNonText || insideNoProofread) {
      continue;
    }
    placed.push({ ...issue, blockId: block.id, from, to, word: block.text.slice(issue.offset, end) });
  }
  return placed;
}

// ===== Plugin: sublinhados como decorações (não mexem no documento salvo) =====

export const proofreadKey = new PluginKey<ProofreadState>('proofread');

interface ProofreadState {
  issues: PlacedIssue[];
  decorations: DecorationSet;
}

function decorate(doc: PMNode, issues: PlacedIssue[]): DecorationSet {
  return DecorationSet.create(
    doc,
    issues.map((i) => Decoration.inline(i.from, i.to, { class: `pf pf-${i.type}` }, { issue: i })),
  );
}

/** Erros que cobrem a posição (toque no sublinhado). */
export function issueAt(state: EditorState, pos: number): PlacedIssue | null {
  const current = proofreadKey.getState(state);
  return current?.issues.find((i) => pos >= i.from && pos <= i.to) ?? null;
}

/**
 * Extensão do editor: guarda os erros e desenha os sublinhados. Ao digitar, os sublinhados acompanham o texto
 * (mapeados pela transação) até a próxima correção do parágrafo.
 */
export const Proofread = Extension.create({
  name: 'proofread',
  addProseMirrorPlugins() {
    return [
      new Plugin<ProofreadState>({
        key: proofreadKey,
        state: {
          init: () => ({ issues: [], decorations: DecorationSet.empty }),
          apply: (tr, value, _old, state) => {
            const next = tr.getMeta(proofreadKey) as PlacedIssue[] | undefined;
            if (next) {
              return { issues: next, decorations: decorate(state.doc, next) };
            }
            if (!tr.docChanged) {
              return value;
            }
            // Acompanha a digitação; erro cujo trecho foi apagado some
            const issues = value.issues
              .map((i) => ({ ...i, from: tr.mapping.map(i.from, 1), to: tr.mapping.map(i.to, -1) }))
              .filter((i) => i.to > i.from);
            return { issues, decorations: value.decorations.map(tr.mapping, tr.doc) };
          },
        },
        props: {
          decorations: (state) => proofreadKey.getState(state)?.decorations,
        },
      }),
    ];
  },
});
