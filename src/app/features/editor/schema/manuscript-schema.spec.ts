import { Editor, type JSONContent } from '@tiptap/core';

import { BLOCK_TYPES } from './block-id';
import { canonicalJson } from './canonical-json';
import { manuscriptExtensions } from './manuscript-extensions';

/** Tipos e marcas que o backend aceita (ManuscriptDocument.java). Se este teste quebrar, o servidor recusará o salvamento. */
const ALLOWED_NODES = new Set(['doc', 'text', 'hardBreak', ...BLOCK_TYPES]);
const ALLOWED_MARKS = new Set(['bold', 'italic', 'underline', 'strike']);

function collect(node: JSONContent, out: { nodes: Set<string>; marks: Set<string>; ids: string[]; missing: string[] }) {
  out.nodes.add(node.type!);
  node.marks?.forEach((mark) => out.marks.add(mark.type));
  if ((BLOCK_TYPES as readonly string[]).includes(node.type!)) {
    const id = node.attrs?.['id'] as string | undefined;
    id ? out.ids.push(id) : out.missing.push(node.type!);
  }
  node.content?.forEach((child) => collect(child, out));
  return out;
}

function analyze(doc: JSONContent) {
  return collect(doc, { nodes: new Set(), marks: new Set(), ids: [], missing: [] });
}

describe('esquema do manuscrito', () => {
  let editor: Editor;

  beforeEach(() => {
    editor = new Editor({ element: document.createElement('div'), extensions: manuscriptExtensions('') });
  });

  afterEach(() => editor.destroy());

  it('atribui ids únicos a todos os blocos ao editar', () => {
    editor.commands.setContent(
      '<h2>Capítulo</h2><p>Primeiro</p><blockquote><p>Citação</p></blockquote><ul><li><p>item</p></li></ul>',
    );
    editor.commands.insertContentAt(editor.state.doc.content.size, '<p>mais</p>');

    const result = analyze(editor.getJSON());
    expect(result.missing).toEqual([]);
    expect(new Set(result.ids).size).toBe(result.ids.length);
  });

  it('ao dividir um parágrafo, a primeira parte mantém o id e a nova recebe outro', () => {
    editor.commands.setContent({
      type: 'doc',
      content: [{ type: 'paragraph', attrs: { id: 'b_original' }, content: [{ type: 'text', text: 'Era uma vez' }] }],
    });
    editor.commands.setTextSelection(4);
    editor.commands.splitBlock();

    const [first, second] = editor.getJSON().content!;
    expect(first.attrs?.['id']).toBe('b_original');
    expect(second.attrs?.['id']).toMatch(/^b_[0-9a-f]{32}$/);
  });

  it('troca ids repetidos (ex.: texto colado)', () => {
    editor.commands.setContent({
      type: 'doc',
      content: [
        { type: 'paragraph', attrs: { id: 'b_same' }, content: [{ type: 'text', text: 'um' }] },
        { type: 'paragraph', attrs: { id: 'b_same' }, content: [{ type: 'text', text: 'dois' }] },
      ],
    });
    editor.commands.insertContentAt(1, 'x');

    expect(new Set(analyze(editor.getJSON()).ids).size).toBe(2);
  });

  it('só produz nós e marcas aceitos pelo backend', () => {
    editor.commands.setContent('<p><b>a</b> <i>b</i> <u>c</u> <s>d</s> <code>e</code> <a href="x">f</a></p><hr><pre>g</pre>');
    editor.commands.insertContentAt(editor.state.doc.content.size, '<p>fim</p>');
    editor.commands.insertSceneBreak();

    const result = analyze(editor.getJSON());
    expect([...result.nodes].filter((n) => !ALLOWED_NODES.has(n))).toEqual([]);
    expect([...result.marks].filter((m) => !ALLOWED_MARKS.has(m))).toEqual([]);
    expect(result.nodes.has('sceneBreak')).toBe(true);
  });
});

describe('recuo de parágrafo (Tab)', () => {
  let editor: Editor;
  const paragraphs = () => editor.getJSON().content!.filter((n) => n.type === 'paragraph');

  beforeEach(() => {
    editor = new Editor({ element: document.createElement('div'), extensions: manuscriptExtensions('') });
    editor.commands.setContent('<p>Era uma vez</p>');
    editor.commands.setTextSelection(3);
  });

  afterEach(() => editor.destroy());

  it('Tab aplica o recuo como atributo, sem inserir caractere de tabulação', () => {
    editor.commands.keyboardShortcut('Tab');

    expect(paragraphs()[0].attrs?.['indent']).toBe(true);
    expect(editor.getText()).toBe('Era uma vez');
    expect(editor.getHTML()).toContain('data-indent="true"');
  });

  it('Enter num parágrafo com recuo cria o próximo também com recuo', () => {
    editor.commands.keyboardShortcut('Tab');
    editor.commands.setTextSelection(editor.state.doc.content.size - 1);
    editor.commands.splitBlock();

    expect(paragraphs().map((p) => p.attrs?.['indent'])).toEqual([true, true]);
  });

  it('Shift+Tab e Backspace no início removem o recuo', () => {
    editor.commands.keyboardShortcut('Tab');
    editor.commands.keyboardShortcut('Shift-Tab');
    expect(paragraphs()[0].attrs?.['indent']).toBe(false);

    editor.commands.keyboardShortcut('Tab');
    editor.commands.setTextSelection(1); // início do parágrafo
    editor.commands.keyboardShortcut('Backspace');
    expect(paragraphs()[0].attrs?.['indent']).toBe(false);
    expect(editor.getText()).toBe('Era uma vez');
  });

  it('em lista, Tab continua aninhando o item em vez de aplicar recuo', () => {
    editor.commands.setContent('<ul><li><p>um</p></li><li><p>dois</p></li></ul>');
    let dois = 0;
    editor.state.doc.descendants((node, pos) => {
      if (node.isText && node.text === 'dois') {
        dois = pos + 1;
      }
    });
    editor.commands.setTextSelection(dois);
    expect(editor.state.selection.$from.parent.textContent).toBe('dois');
    editor.commands.keyboardShortcut('Tab');

    const json = JSON.stringify(editor.getJSON());
    expect(json).not.toContain('"indent":true');
    expect(editor.getJSON().content![0].content!.length).toBe(1); // "dois" foi para dentro de "um"
  });
});

describe('canonicalJson', () => {
  it('ignora a ordem das chaves, como o jsonb do Postgres', () => {
    expect(canonicalJson({ type: 'text', text: 'oi', marks: [{ type: 'bold' }] })).toBe(
      canonicalJson({ marks: [{ type: 'bold' }], text: 'oi', type: 'text' }),
    );
  });
});
