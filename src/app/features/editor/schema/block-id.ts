import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

/** Blocos que recebem id estável (mesma lista de BLOCK_ATTRS em ManuscriptDocument.java). */
export const BLOCK_TYPES = [
  'paragraph',
  'heading',
  'blockquote',
  'sceneBreak',
  'illustration',
  'bulletList',
  'orderedList',
  'listItem',
] as const;

const BLOCK_TYPE_SET = new Set<string>(BLOCK_TYPES);

/**
 * "b_" + 32 caracteres hex. Não usa crypto.randomUUID(), que só existe em contexto seguro (HTTPS):
 * no celular, testando pela rede local em http://, ele não está disponível.
 */
export function newBlockId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return 'b_' + Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Garante que todo bloco tenha um id único (§8.2 da arquitetura). Os ids ancoram comentários por parágrafo,
 * sugestões de revisores e alertas de continuidade, então sobrevivem às edições: ao dividir um parágrafo (Enter),
 * a primeira parte mantém o id e a nova recebe outro; ao colar ou duplicar, ids repetidos são trocados.
 */
export const BlockId = Extension.create({
  name: 'blockId',

  addGlobalAttributes() {
    return [
      {
        types: [...BLOCK_TYPES],
        attributes: {
          id: {
            default: null,
            keepOnSplit: false,
            parseHTML: (element) => element.getAttribute('data-block-id'),
            renderHTML: (attributes) => (attributes['id'] ? { 'data-block-id': attributes['id'] } : {}),
          },
        },
      },
    ];
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('blockId'),
        appendTransaction: (transactions, _oldState, newState) => {
          if (!transactions.some((tr) => tr.docChanged)) {
            return null;
          }

          const seen = new Set<string>();
          const tr = newState.tr;
          let changed = false;

          newState.doc.descendants((node, pos) => {
            if (!BLOCK_TYPE_SET.has(node.type.name)) {
              return;
            }
            const id = node.attrs['id'] as string | null;
            if (id && !seen.has(id)) {
              seen.add(id);
              return;
            }
            const fresh = newBlockId();
            seen.add(fresh);
            tr.setNodeMarkup(pos, undefined, { ...node.attrs, id: fresh });
            changed = true;
          });

          return changed ? tr.setMeta('addToHistory', false) : null;
        },
      }),
    ];
  },
});
