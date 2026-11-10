import { Editor } from '@tiptap/core';

import { ChapterNote } from '../../../core/models/api.models';
import { orderNotes } from '../chapter-notes/chapter-notes';
import { addNoteAnchor, noteAnchors, noteAt, removeNoteAnchor } from './comment-anchor';
import { manuscriptExtensions } from './manuscript-extensions';

const NOTE = '0196f000-0000-7000-8000-00003f9a2c71';

function editorWith(text: string): Editor {
  const editor = new Editor({ element: document.createElement('div'), extensions: manuscriptExtensions('') });
  editor.commands.setContent({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] });
  return editor;
}

describe('notas do autor', () => {
  it('a marca no JSON tem só o threadId (o que o servidor aceita) e o texto não muda', () => {
    const editor = editorWith('A guerra começou cedo.');
    addNoteAnchor(editor, 3, 9, NOTE); // "guerra"

    const text = editor.getJSON().content![0].content!.find((n) => n.marks?.length);
    expect(text).toEqual({ type: 'text', text: 'guerra', marks: [{ type: 'commentAnchor', attrs: { threadId: NOTE } }] });
    expect(editor.getText()).toBe('A guerra começou cedo.');
    expect(noteAnchors(editor).get(NOTE)?.text).toBe('guerra');
    expect(noteAt(editor, 5)).toBe(NOTE);
    editor.destroy();
  });

  it('tirar a nota tira a marca de todo o trecho', () => {
    const editor = editorWith('A guerra começou cedo.');
    addNoteAnchor(editor, 3, 9, NOTE);
    removeNoteAnchor(editor, NOTE);
    expect(noteAnchors(editor).size).toBe(0);
    expect(JSON.stringify(editor.getJSON())).not.toContain('commentAnchor');
    editor.destroy();
  });

  it('o painel segue a ordem do texto; nota sem trecho vai para o fim', () => {
    const note = (id: string, createdAt: string) => ({ id, createdAt, quote: `q${id}` }) as ChapterNote;
    const anchors = new Map([['b', { text: 'segundo', from: 20 }], ['a', { text: 'primeiro', from: 2 }]]);

    const views = orderNotes([note('c', '1'), note('b', '2'), note('a', '3')], anchors);

    expect(views.map((v) => v.note.id)).toEqual(['a', 'b', 'c']);
    expect(views[2]).toMatchObject({ orphan: true, quote: 'qc' });
    expect(views[0].quote).toBe('primeiro');
  });
});
