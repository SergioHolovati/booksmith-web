import type { AnyExtension } from '@tiptap/core';
import { CharacterCount, Placeholder } from '@tiptap/extensions';
import StarterKit from '@tiptap/starter-kit';

import { BlockId } from './block-id';
import { ParagraphIndent } from './paragraph-indent';
import { SceneBreak } from './scene-break';
import { MentionSource, mentionExtension } from './mention';
import { CommentAnchor } from './comment-anchor';

/**
 * Esquema do manuscrito. Precisa bater com o validador do backend (ManuscriptDocument.java):
 * blocos paragraph (com recuo opcional), heading (1–3), blockquote, sceneBreak, listas;
 * marcas bold, italic, underline, strike e commentAnchor (nota do autor); menção (@) a personagem, lugar ou ficha do mundo.
 * Um nó ou marca a mais aqui faz o servidor recusar o salvamento (422).
 */
export function manuscriptExtensions(placeholder: string, mentions?: MentionSource): AnyExtension[] {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      code: false,
      codeBlock: false,
      horizontalRule: false, // substituído pela quebra de cena
      link: false,
    }),
    SceneBreak,
    BlockId,
    ParagraphIndent,
    Placeholder.configure({ placeholder }),
    CharacterCount,
    mentionExtension(mentions),
    CommentAnchor,
  ];
}
