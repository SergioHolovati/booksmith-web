import { Node, mergeAttributes } from '@tiptap/core';

/** Os tipos de destaque (os mesmos do servidor: ManuscriptDocument.CALLOUT_KINDS). */
export const CALLOUT_KINDS = [
  { value: 'verse', label: 'Versículo-chave' },
  { value: 'reflect', label: 'Para refletir' },
  { value: 'prayer', label: 'Oração' },
  { value: 'exercise', label: 'Exercício' },
  { value: 'summary', label: 'Resumo' },
  { value: 'objectives', label: 'Objetivos' },
  { value: 'important', label: 'Importante' },
  { value: 'quote', label: 'Em destaque' },
] as const;

export type CalloutKind = (typeof CALLOUT_KINDS)[number]['value'];

export function calloutLabel(kind: string | null | undefined): string {
  return CALLOUT_KINDS.find((k) => k.value === kind)?.label ?? 'Importante';
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    callout: {
      /** Põe os parágrafos selecionados num quadro do tipo dado; dentro de um quadro, troca o tipo. */
      setCallout: (kind: CalloutKind) => ReturnType;
      /** Tira o quadro (os parágrafos voltam ao texto). */
      unsetCallout: () => ReturnType;
    };
  }
}

/**
 * Bloco de destaque (§ tipos de livro): um quadro com o tipo (Versículo-chave, Para refletir, Oração, Exercício,
 * Resumo, Objetivos, Importante, Em destaque) e parágrafos ou listas dentro. No documento guarda só o id e o tipo; o
 * nome do tipo aparece em cima do quadro (no editor, pelo CSS; no livro, escrito pelo exportador).
 */
export const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: '(paragraph | bulletList | orderedList)+',
  defining: true,

  addAttributes() {
    return {
      kind: {
        default: 'important',
        parseHTML: (el) => el.getAttribute('data-callout'),
        renderHTML: (attrs) => ({ 'data-callout': attrs['kind'], 'data-label': calloutLabel(attrs['kind'] as string) }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-callout]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { class: 'callout' }), 0];
  },

  addCommands() {
    return {
      setCallout:
        (kind) =>
        ({ editor, commands }) => {
          if (editor.isActive(this.name)) {
            return commands.updateAttributes(this.name, { kind });
          }
          return commands.wrapIn(this.name, { kind });
        },
      unsetCallout:
        () =>
        ({ commands }) =>
          commands.lift(this.name),
    };
  },
});
