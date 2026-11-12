import { Editor } from '@tiptap/core';

import { manuscriptExtensions } from '../schema/manuscript-extensions';
import { applyFix, textEdits } from './apply-fix';

/** Aplica as trocas num texto comum, para conferir o resultado. */
function apply(before: string, after: string): string {
  let text = before;
  for (const edit of textEdits(before, after).reverse()) {
    text = text.slice(0, edit.from) + edit.insert + text.slice(edit.to);
  }
  return text;
}

describe('trocar só o que mudou', () => {
  it('aspas viram travessão mexendo só nas pontas', () => {
    const before = '"A dona Lurdes não tinha machucado nenhum" respondeu Giulia.';
    const after = '— A dona Lurdes não tinha machucado nenhum — respondeu Giulia.';
    expect(apply(before, after)).toBe(after);
    // o miolo da fala fica intocado: só o começo e o fim mudam
    expect(textEdits(before, after)).toHaveLength(2);
  });

  it('maiúscula, palavra trocada e texto igual', () => {
    expect(apply('"próxima pergunta?" Perguntou Ana.', '— Próxima pergunta? — perguntou Ana.'))
      .toBe('— Próxima pergunta? — perguntou Ana.');
    expect(apply('não tinha machucado nenhum', 'não tinha nenhum machucado')).toBe('não tinha nenhum machucado');
    expect(textEdits('igual', 'igual')).toEqual([]);
  });

  it('no editor, o itálico no meio do parágrafo continua depois da troca', () => {
    const editor = new Editor({
      extensions: manuscriptExtensions(''),
      content: {
        type: 'doc',
        content: [{
          type: 'paragraph',
          attrs: { id: 'b_1' },
          content: [
            { type: 'text', text: '"Eu vi a ' },
            { type: 'text', text: 'harpia', marks: [{ type: 'italic' }] },
            { type: 'text', text: ' ontem" respondi.' },
          ],
        }],
      },
    });

    const ok = applyFix(editor, '"Eu vi a harpia ontem" respondi.', '— Eu vi a harpia ontem — respondi.', 'b_1');

    expect(ok).toBe(true);
    expect(editor.state.doc.textContent).toBe('— Eu vi a harpia ontem — respondi.');
    const italic: string[] = [];
    editor.state.doc.descendants((node) => {
      if (node.isText && node.marks.some((m) => m.type.name === 'italic')) {
        italic.push(node.text ?? '');
      }
    });
    expect(italic).toEqual(['harpia']);
    // um Ctrl+Z desfaz tudo
    editor.commands.undo();
    expect(editor.state.doc.textContent).toBe('"Eu vi a harpia ontem" respondi.');
  });

  it('trecho que sumiu não troca nada', () => {
    const editor = new Editor({
      extensions: manuscriptExtensions(''),
      content: { type: 'doc', content: [{ type: 'paragraph', attrs: { id: 'b_1' }, content: [{ type: 'text', text: 'Outro texto.' }] }] },
    });
    expect(applyFix(editor, 'não existe', 'nada', 'b_1')).toBe(false);
    expect(editor.state.doc.textContent).toBe('Outro texto.');
  });
});
