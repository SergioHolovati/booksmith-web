import { Mark, mergeAttributes } from '@tiptap/core';
import type { Editor } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

/** Notas resolvidas (por threadId): o trecho fica mais apagado. Só visual: não vai para o documento. */
const resolvedKey = new PluginKey<Set<string>>('resolvedNotes');

/**
 * Trecho com nota do autor (§4.1 do produto). Só {@code threadId} (o id da nota), que é o que o servidor aceita
 * (ManuscriptDocument.COMMENT_ANCHOR). Notas podem se sobrepor; o texto digitado depois do trecho não entra nele.
 * Nunca sai no livro exportado: os exportadores só conhecem negrito, itálico, sublinhado e riscado.
 */
export const CommentAnchor = Mark.create({
  name: 'commentAnchor',
  inclusive: false,
  excludes: '',

  addAttributes() {
    return {
      threadId: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-note'),
        renderHTML: (attrs) => ({ 'data-note': attrs['threadId'] }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-note]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { class: 'note-anchor' }), 0];
  },

  addProseMirrorPlugins() {
    return [
      new Plugin<Set<string>>({
        key: resolvedKey,
        state: {
          init: () => new Set<string>(),
          apply: (tr, value) => (tr.getMeta(resolvedKey) as Set<string> | undefined) ?? value,
        },
        props: {
          decorations: (state) => {
            const resolved = resolvedKey.getState(state);
            if (!resolved?.size) {
              return DecorationSet.empty;
            }
            const decorations: Decoration[] = [];
            state.doc.descendants((node, pos) => {
              if (!node.isText) {
                return;
              }
              for (const mark of node.marks) {
                if (mark.type.name === 'commentAnchor' && resolved.has(mark.attrs['threadId'])) {
                  decorations.push(Decoration.inline(pos, pos + node.nodeSize, { class: 'note-resolved' }));
                }
              }
            });
            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
});

/** Informa ao editor quais notas estão resolvidas (só muda o visual). */
export function setResolvedNotes(editor: Editor, ids: Set<string>): void {
  editor.view.dispatch(editor.state.tr.setMeta(resolvedKey, ids).setMeta('addToHistory', false));
}

/** Marca o trecho [from, to] com a nota {@code threadId}. */
export function addNoteAnchor(editor: Editor, from: number, to: number, threadId: string): void {
  const type = editor.schema.marks['commentAnchor'];
  editor.view.dispatch(editor.state.tr.addMark(from, to, type.create({ threadId })));
}

/** Tira a marca da nota de todo o capítulo (o texto continua igual). */
export function removeNoteAnchor(editor: Editor, threadId: string): void {
  const type = editor.schema.marks['commentAnchor'];
  const tr = editor.state.tr;
  editor.state.doc.descendants((node, pos) => {
    const mark = node.marks.find((m) => m.type === type && m.attrs['threadId'] === threadId);
    if (mark) {
      tr.removeMark(pos, pos + node.nodeSize, mark);
    }
  });
  if (tr.docChanged) {
    editor.view.dispatch(tr);
  }
}

/** Trecho atual de cada nota, na ordem em que aparece no texto. Nota sem trecho não aparece aqui. */
export function noteAnchors(editor: Editor): Map<string, { text: string; from: number }> {
  const anchors = new Map<string, { text: string; from: number }>();
  editor.state.doc.descendants((node, pos) => {
    if (!node.isText) {
      return;
    }
    for (const mark of node.marks) {
      if (mark.type.name === 'commentAnchor') {
        const id = mark.attrs['threadId'] as string;
        const current = anchors.get(id);
        anchors.set(id, current ? { text: current.text + node.text, from: current.from } : { text: node.text ?? '', from: pos });
      }
    }
  });
  return anchors;
}

/** threadId da nota no ponto {@code pos} (toque no trecho), ou null. */
export function noteAt(editor: Editor, pos: number): string | null {
  const $pos = editor.state.doc.resolve(pos);
  const marks = [...$pos.marks(), ...($pos.nodeAfter?.marks ?? [])];
  const mark = marks.find((m) => m.type.name === 'commentAnchor');
  return mark ? (mark.attrs['threadId'] as string) : null;
}
