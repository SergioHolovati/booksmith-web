import { Mark } from '@tiptap/core';
import type { Editor } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    proofreadOff: {
      toggleProofreadOff: () => ReturnType;
    };
  }
}

/**
 * Trecho que o corretor não revisa (§4.1 do produto): a fala de um personagem que "fala errado" de propósito.
 * Sem atributos (o servidor aceita só o tipo); os exportadores ignoram, então o livro sai igual.
 */
export const ProofreadOff = Mark.create({
  name: 'proofreadOff',
  inclusive: true,

  parseHTML() {
    return [{ tag: 'span[data-no-proofread]' }];
  },

  renderHTML() {
    return ['span', { 'data-no-proofread': '', class: 'no-proofread' }, 0];
  },

  addCommands() {
    return {
      toggleProofreadOff:
        () =>
        ({ state, chain }) => {
          // Sem seleção: o parágrafo inteiro (o caso comum é a fala de um personagem, numa linha só)
          if (state.selection.empty) {
            const $pos = state.selection.$from;
            const from = $pos.start();
            const to = $pos.end();
            const active = state.doc.rangeHasMark(from, to, this.type);
            return active
              ? chain().setTextSelection({ from, to }).unsetMark(this.name).setTextSelection($pos.pos).run()
              : chain().setTextSelection({ from, to }).setMark(this.name).setTextSelection($pos.pos).run();
          }
          return chain().toggleMark(this.name).run();
        },
    };
  },
});

/** Marca o parágrafo inteiro da posição {@code pos} como "não revisar". */
export function proofreadOffParagraph(editor: Editor, pos: number): void {
  const $pos = editor.state.doc.resolve(pos);
  const type = editor.schema.marks['proofreadOff'];
  editor.view.dispatch(editor.state.tr.addMark($pos.start(), $pos.end(), type.create()));
}
