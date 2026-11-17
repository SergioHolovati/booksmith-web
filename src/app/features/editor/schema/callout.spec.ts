import { Editor } from '@tiptap/core';

import { manuscriptExtensions } from './manuscript-extensions';

describe('quadro de destaque', () => {
  it('envolve o parágrafo, troca o tipo e sai, guardando só o tipo', () => {
    const editor = new Editor({ element: document.createElement('div'), extensions: manuscriptExtensions('') });
    editor.commands.setContent({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Ore sem cessar.' }] }] });
    editor.commands.setTextSelection(3);

    expect(editor.commands.setCallout('verse')).toBe(true);
    const callout = editor.getJSON().content![0];
    expect(callout.type).toBe('callout');
    expect(callout.attrs!['kind']).toBe('verse');
    expect(callout.attrs!['id']).toMatch(/^[A-Za-z0-9_-]{4,64}$/);
    expect(callout.content![0].type).toBe('paragraph');

    editor.commands.setCallout('prayer');
    expect(editor.getJSON().content![0].attrs!['kind']).toBe('prayer');
    expect(editor.getText().trim()).toBe('Ore sem cessar.');

    editor.commands.unsetCallout();
    expect(editor.getJSON().content![0].type).toBe('paragraph');
    editor.destroy();
  });
});
