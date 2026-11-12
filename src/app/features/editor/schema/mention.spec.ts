import { Editor } from '@tiptap/core';

import { groupByBook } from '../../../shared/mentions/mentioned-in';
import { MentionedIn } from '../../../core/models/api.models';
import { manuscriptExtensions } from './manuscript-extensions';
import { MentionTarget, filterTargets, refreshMentionLabels } from './mention';

const LIA_ID = '0196f000-0000-7000-8000-00003f9a2c71';

const targets: MentionTarget[] = [
  { id: '1', kind: 'character', label: 'João Pedro', hint: 'Personagem' },
  { id: '2', kind: 'character', label: 'Ana Joana', hint: 'Personagem' },
  { id: '3', kind: 'place', label: 'Porto de Vel', hint: 'Lugar' },
];

describe('menção com @', () => {
  it('acha sem acento, quem começa com o texto primeiro', () => {
    expect(filterTargets(targets, 'jo').map((t) => t.id)).toEqual(['1', '2']);
    expect(filterTargets(targets, 'joao').map((t) => t.id)).toEqual(['1']);
    expect(filterTargets(targets, 'vel').map((t) => t.id)).toEqual(['3']);
    expect(filterTargets(targets, '')).toHaveLength(3);
  });

  it('acha pelo apelido: a sugestão mostra o apelido, diz de quem é e leva o id do personagem', () => {
    const withAliases: MentionTarget[] = [
      { id: '1', kind: 'character', label: 'José Ribeiro', hint: 'Personagem', aliases: ['Zé', 'Capitão'] },
      { id: '2', kind: 'character', label: 'Zélia', hint: 'Personagem' },
      { id: '3', kind: 'place', label: 'Porto de Vel', hint: 'Lugar', aliases: ['O Porto'] },
    ];

    // nome antes de apelido; o mesmo personagem não aparece duas vezes
    expect(filterTargets(withAliases, 'ze')).toEqual([
      withAliases[1],
      { id: '1', kind: 'character', label: 'Zé', hint: 'Apelido de José Ribeiro' },
    ]);
    expect(filterTargets(withAliases, 'capi')).toEqual([
      { id: '1', kind: 'character', label: 'Capitão', hint: 'Apelido de José Ribeiro' },
    ]);
    expect(filterTargets(withAliases, 'jose').map((t) => t.label)).toEqual(['José Ribeiro']);
    expect(filterTargets(withAliases, 'porto')[0]).toEqual({ id: '3', kind: 'place', label: 'Porto de Vel', hint: 'Lugar', aliases: ['O Porto'] });
    expect(filterTargets(withAliases, 'o p')[0]).toMatchObject({ id: '3', label: 'O Porto', hint: 'Outro nome de Porto de Vel' });
  });

  it('menção pelo apelido continua com o apelido; apelido apagado da ficha volta ao nome', () => {
    const editor = new Editor({ element: document.createElement('div'), extensions: manuscriptExtensions('') });
    editor.commands.setContent({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'mention', attrs: { id: LIA_ID, kind: 'character', label: 'Li' } }] }],
    });

    expect(refreshMentionLabels(editor, [{ id: LIA_ID, kind: 'character', label: 'Lia', hint: '', aliases: ['Li'] }])).toBe(0);
    expect(editor.getText()).toBe('Li');
    expect(refreshMentionLabels(editor, [{ id: LIA_ID, kind: 'character', label: 'Lia', hint: '', aliases: [] }])).toBe(1);
    expect(editor.getText()).toBe('Lia');
    editor.destroy();
  });

  it('o JSON da menção tem só o que o servidor aceita (id, kind, label) e o nome conta como texto', () => {
    const editor = new Editor({ element: document.createElement('div'), extensions: manuscriptExtensions('') });
    editor.commands.setContent({
      type: 'doc',
      content: [{ type: 'paragraph', content: [
        { type: 'mention', attrs: { id: LIA_ID, kind: 'character', label: 'Lia' } },
        { type: 'text', text: ' chegou.' },
      ] }],
    });

    const mention = editor.getJSON().content![0].content![0];
    expect(mention).toEqual({ type: 'mention', attrs: { id: LIA_ID, kind: 'character', label: 'Lia' } });
    expect(editor.getText()).toBe('Lia chegou.');
    editor.destroy();
  });

  it('personagem renomeado: a menção passa a mostrar o nome novo', () => {
    const editor = new Editor({ element: document.createElement('div'), extensions: manuscriptExtensions('') });
    editor.commands.setContent({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'mention', attrs: { id: LIA_ID, kind: 'character', label: 'Lia' } }] }],
    });

    const changed = refreshMentionLabels(editor, [{ id: LIA_ID, kind: 'character', label: 'Lia Moreau', hint: '' }]);

    expect(changed).toBe(1);
    expect(editor.getText()).toBe('Lia Moreau');
    expect(refreshMentionLabels(editor, [{ id: LIA_ID, kind: 'character', label: 'Lia Moreau', hint: '' }])).toBe(0);
    editor.destroy();
  });

  it('"Aparece em" agrupa os capítulos por livro', () => {
    const item = (bookId: string, chapterId: string) => ({ bookId, bookTitle: bookId, chapterId }) as MentionedIn;
    const groups = groupByBook([item('a', '1'), item('b', '2'), item('a', '3')]);
    expect(groups.map((g) => [g.bookId, g.chapters.map((c) => c.chapterId)])).toEqual([['a', ['1', '3']], ['b', ['2']]]);
  });
});
