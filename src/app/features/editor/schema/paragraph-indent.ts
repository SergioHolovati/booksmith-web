import { Extension } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    paragraphIndent: {
      setParagraphIndent: (indent: boolean) => ReturnType;
      toggleParagraphIndent: () => ReturnType;
    };
  }
}

/**
 * Recuo da primeira linha do parágrafo, como o Tab do Word. É um atributo do parágrafo (`indent`), e não um
 * caractere de tabulação: na diagramação vira recuo tipográfico de verdade (ManuscriptDocument.java aceita
 * `indent` booleano só em parágrafos).
 *
 * - Tab: aplica o recuo (em lista, Tab continua aninhando o item).
 * - Enter num parágrafo com recuo: o próximo já nasce com recuo.
 * - Shift+Tab, ou Backspace no início do parágrafo: remove o recuo.
 * - Esc: sai do editor (sem isso, quem navega só pelo teclado ficaria preso, porque Tab não muda mais o foco).
 */
export const ParagraphIndent = Extension.create({
  name: 'paragraphIndent',

  addGlobalAttributes() {
    return [
      {
        types: ['paragraph'],
        attributes: {
          indent: {
            default: false,
            keepOnSplit: true,
            parseHTML: (element) => element.getAttribute('data-indent') === 'true',
            renderHTML: (attributes) => (attributes['indent'] ? { 'data-indent': 'true' } : {}),
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setParagraphIndent:
        (indent: boolean) =>
        ({ commands }) =>
          commands.updateAttributes('paragraph', { indent }),
      toggleParagraphIndent:
        () =>
        ({ editor, commands }) =>
          commands.updateAttributes('paragraph', { indent: !editor.getAttributes('paragraph')['indent'] }),
    };
  },

  addKeyboardShortcuts() {
    const inList = () => this.editor.isActive('listItem');

    return {
      Tab: () => {
        if (inList()) {
          return false; // deixa a lista aninhar o item
        }
        this.editor.commands.setParagraphIndent(true);
        return true; // consome o Tab mesmo em títulos, para o foco não sair do texto
      },
      'Shift-Tab': () => {
        if (inList()) {
          return false;
        }
        this.editor.commands.setParagraphIndent(false);
        return true;
      },
      Backspace: () => {
        const { selection } = this.editor.state;
        const atParagraphStart =
          selection.empty && selection.$from.parentOffset === 0 && selection.$from.parent.type.name === 'paragraph';
        if (atParagraphStart && selection.$from.parent.attrs['indent']) {
          return this.editor.commands.setParagraphIndent(false);
        }
        return false;
      },
      Escape: () => this.editor.commands.blur(),
    };
  },
});
