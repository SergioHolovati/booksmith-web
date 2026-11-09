import { Node, mergeAttributes, nodeInputRule } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    sceneBreak: {
      insertSceneBreak: () => ReturnType;
    };
  }
}

/** Quebra de cena ("* * *"). Digitar *** e espaço numa linha vazia também cria uma. */
export const SceneBreak = Node.create({
  name: 'sceneBreak',
  group: 'block',
  atom: true,
  selectable: true,

  parseHTML() {
    return [{ tag: 'div[data-scene-break]' }, { tag: 'hr' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-scene-break': '', class: 'scene-break' }), '* * *'];
  },

  addCommands() {
    return {
      insertSceneBreak:
        () =>
        ({ chain }) =>
          chain().insertContent({ type: this.name }).run(),
    };
  },

  addInputRules() {
    return [nodeInputRule({ find: /^\*\*\*\s$/, type: this.type })];
  },
});
