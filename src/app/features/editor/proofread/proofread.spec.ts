import { Editor } from '@tiptap/core';

import { ProofreadIssue } from '../../../core/models/api.models';
import { manuscriptExtensions } from '../schema/manuscript-extensions';
import { Proofread, blockTexts, issueAt, placeIssues, proofreadKey } from './proofread';
import { chunks } from './proofreader';

const LIA = '0196f000-0000-7000-8000-00003f9a2c71';

function issue(offset: number, length: number, type: ProofreadIssue['type'] = 'spelling'): ProofreadIssue {
  return { offset, length, type, message: 'm', shortMessage: '', replacements: ['muito'], ruleId: 'R' };
}

function editorWith(content: object[]): Editor {
  const editor = new Editor({ element: document.createElement('div'), extensions: [...manuscriptExtensions(''), Proofread] });
  editor.commands.setContent({ type: 'doc', content: [{ type: 'paragraph', attrs: { id: 'b_p1' }, content }] });
  return editor;
}

describe('corretor no editor', () => {
  it('o texto do parágrafo junta negrito, itálico e o nome da menção', () => {
    const editor = editorWith([
      { type: 'mention', attrs: { id: LIA, kind: 'character', label: 'Lia' } },
      { type: 'text', text: ' ficou ' },
      { type: 'text', text: 'muinto', marks: [{ type: 'bold' }] },
      { type: 'text', text: ' feliz.' },
    ]);
    const [block] = blockTexts(editor.state.doc);
    expect(block).toMatchObject({ id: 'b_p1', text: 'Lia ficou muinto feliz.' });

    // "muinto" (offset 10) vira a posição certa no documento, mesmo em negrito e depois da menção
    const [placed] = placeIssues(block, [issue(10, 6)]);
    expect(editor.state.doc.textBetween(placed.from, placed.to)).toBe('muinto');
    expect(placed.word).toBe('muinto');
    editor.destroy();
  });

  it('erro que cai na menção ou atravessa a quebra de linha é descartado', () => {
    const editor = editorWith([
      { type: 'mention', attrs: { id: LIA, kind: 'character', label: 'Lia' } },
      { type: 'text', text: ' era' },
      { type: 'hardBreak' },
      { type: 'text', text: 'feliz' },
    ]);
    const [block] = blockTexts(editor.state.doc);
    expect(block.text).toBe('Lia era\nfeliz');
    expect(placeIssues(block, [issue(0, 3), issue(4, 6), issue(8, 5)]).map((p) => p.word)).toEqual(['feliz']);
    editor.destroy();
  });

  it('sublinhado acompanha a digitação e o toque encontra o erro', () => {
    const editor = editorWith([{ type: 'text', text: 'Uma carta muinto longa.' }]);
    const [block] = blockTexts(editor.state.doc);
    const placed = placeIssues(block, [issue(10, 6)]);
    editor.view.dispatch(editor.state.tr.setMeta(proofreadKey, placed));

    editor.view.dispatch(editor.state.tr.insertText('Era ', 1)); // escreve antes do erro
    const moved = proofreadKey.getState(editor.state)!.issues[0];
    expect(editor.state.doc.textBetween(moved.from, moved.to)).toBe('muinto');
    expect(issueAt(editor.state, moved.from + 2)?.word).toBe('muinto');
    editor.destroy();
  });

  it('divide em lotes que cabem na API e pula parágrafo gigante', () => {
    const block = (id: string, size: number) => ({ id, text: 'x'.repeat(size), segments: [] });
    const many = Array.from({ length: 130 }, (_, i) => block(`b${i}`, 10));
    expect(chunks(many).map((c) => c.length)).toEqual([60, 60, 10]);
    expect(chunks([block('a', 6000), block('b', 5)]).flat().map((b) => b.id)).toEqual(['b']);
  });
});
