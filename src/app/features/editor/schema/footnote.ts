import { Node, mergeAttributes } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    footnote: {
      insertFootnote: (text: string) => ReturnType;
    };
  }
}

/** Limite do texto da nota (o mesmo do servidor). */
export const MAX_FOOTNOTE = 2000;

/**
 * Nota de rodapé (§ tipos de livro): fica dentro do parágrafo, no lugar da chamada, e guarda só o texto da nota
 * (`attrs.text`), o que o servidor aceita (ManuscriptDocument). No editor aparece como o número da chamada,
 * numerado sozinho por capítulo (contador CSS); o texto aparece ao passar o dedo ou o mouse e no painel ao tocar.
 * Sai no pé da página no PDF, como nota que abre ao tocar no ePub e como nota de rodapé de verdade no Word.
 */
export const Footnote = Node.create({
  name: 'footnote',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      text: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-footnote') ?? '',
        renderHTML: (attrs) => ({ 'data-footnote': attrs['text'] }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'sup[data-footnote]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return ['sup', mergeAttributes(HTMLAttributes, { class: 'footnote-call', title: node.attrs['text'] as string })];
  },

  renderText() {
    return ''; // a nota não é texto do capítulo (nem para contar palavras)
  },

  addCommands() {
    return {
      insertFootnote:
        (text) =>
        ({ chain }) => {
          const clean = text.trim().slice(0, MAX_FOOTNOTE);
          return clean ? chain().insertContent({ type: this.name, attrs: { text: clean } }).run() : false;
        },
    };
  },
});
