import { Editor } from '@tiptap/core';

import { manuscriptExtensions } from './manuscript-extensions';

describe('nota de rodapé no texto', () => {
  it('fica no lugar da chamada, guarda só o texto e não conta como palavra', () => {
    const editor = new Editor({ element: document.createElement('div'), extensions: manuscriptExtensions('') });
    editor.commands.setContent({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Ele orou.' }] }] });
    editor.commands.setTextSelection(editor.state.doc.content.size - 1);

    expect(editor.commands.insertFootnote('  Mateus 6:9.  ')).toBe(true);
    expect(editor.commands.insertFootnote('   ')).toBe(false);

    const paragraph = editor.getJSON().content![0];
    expect(paragraph.content!.at(-1)).toEqual({ type: 'footnote', attrs: { text: 'Mateus 6:9.' } });
    expect(editor.getText().trim()).toBe('Ele orou.');
    editor.destroy();
  });
});
