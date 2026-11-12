import { Editor } from '@tiptap/core';

import { manuscriptExtensions } from '../schema/manuscript-extensions';
import { findQuote } from './find-quote';

function editorWith(paragraphs: { id: string; text: string; bold?: string }[]): Editor {
  return new Editor({
    extensions: manuscriptExtensions(''),
    content: {
      type: 'doc',
      content: paragraphs.map((p) => ({
        type: 'paragraph',
        attrs: { id: p.id },
        content: [
          { type: 'text', text: p.text },
          ...(p.bold ? [{ type: 'text', text: p.bold, marks: [{ type: 'bold' }] }] : []),
        ],
      })),
    },
  });
}

describe('achar o trecho apontado pela revisão', () => {
  it('acha no parágrafo indicado, mesmo com negrito no meio e sem diferença de maiúsculas', () => {
    const editor = editorWith([
      { id: 'b_1', text: 'Lia viu as xícara. ' },
      { id: 'b_2', text: 'Depois viu as ', bold: 'xícara na prateleira.' },
    ]);
    const range = findQuote(editor.state.doc, 'AS XÍCARA NA', 'b_2');
    expect(range).not.toBeNull();
    expect(editor.state.doc.textBetween(range!.from, range!.to)).toBe('as xícara na');
    editor.destroy();
  });

  it('se o parágrafo mudou, aceita o trecho em outro lugar; se sumiu, devolve null', () => {
    const editor = editorWith([{ id: 'b_1', text: 'Tomás tinha olhos azuis.' }]);
    const range = findQuote(editor.state.doc, 'olhos azuis', 'b_que_nao_existe');
    expect(editor.state.doc.textBetween(range!.from, range!.to)).toBe('olhos azuis');
    expect(findQuote(editor.state.doc, 'olhos verdes', 'b_1')).toBeNull();
    expect(findQuote(editor.state.doc, '', 'b_1')).toBeNull();
    editor.destroy();
  });
});
