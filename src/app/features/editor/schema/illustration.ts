import { Node, mergeAttributes } from '@tiptap/core';

/** Evento disparado quando os endereços das imagens chegam (o capítulo abre antes). */
export const ILLUSTRATIONS_LOADED = 'booksmith:illustrations-loaded';

/** Endereço de cada imagem da biblioteca do universo (id → URL), para o editor desenhar a ilustração. */
export type IllustrationSource = () => Map<string, string>;

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    illustration: {
      insertIllustration: (attrs: { imageId: string; caption?: string | null }) => ReturnType;
    };
  }
}

/**
 * Ilustração no texto (§4.4 do produto): uma imagem da biblioteca do universo com legenda opcional. No documento
 * guarda só {@code imageId} e {@code caption} (mais o id do bloco), o que o servidor aceita (ManuscriptDocument).
 * Na exportação, vira a imagem no ePub e no PDF e um marcador "[Ilustração: legenda]" no Word.
 */
export function illustrationExtension(source?: IllustrationSource) {
  return Node.create({
    name: 'illustration',
    group: 'block',
    atom: true,
    selectable: true,
    draggable: false,

    addAttributes() {
      return {
        imageId: { default: null, parseHTML: (el) => el.getAttribute('data-image'), renderHTML: (a) => ({ 'data-image': a['imageId'] }) },
        caption: { default: null, parseHTML: (el) => el.querySelector('figcaption')?.textContent ?? null, renderHTML: () => ({}) },
      };
    },

    parseHTML() {
      return [{ tag: 'figure[data-image]' }];
    },

    renderHTML({ node, HTMLAttributes }) {
      const caption = (node.attrs['caption'] as string | null) ?? '';
      return ['figure', mergeAttributes(HTMLAttributes, { class: 'illustration' }), ['figcaption', caption]];
    },

    addNodeView() {
      return ({ node }) => {
        const figure = document.createElement('figure');
        figure.className = 'illustration';
        figure.setAttribute('data-image', String(node.attrs['imageId']));
        const url = source?.().get(node.attrs['imageId'] as string);
        if (url) {
          const img = document.createElement('img');
          img.src = url;
          img.alt = (node.attrs['caption'] as string) || 'Ilustração';
          img.draggable = false;
          figure.appendChild(img);
        } else {
          const missing = document.createElement('div');
          missing.className = 'illustration-missing';
          missing.textContent = 'Ilustração';
          figure.appendChild(missing);
          // A lista de imagens chega depois que o capítulo abre: quando chegar, troca o aviso pela imagem
          const fill = () => {
            const late = source?.().get(node.attrs['imageId'] as string);
            if (late && missing.isConnected) {
              const img = document.createElement('img');
              img.src = late;
              img.alt = (node.attrs['caption'] as string) || 'Ilustração';
              img.draggable = false;
              missing.replaceWith(img);
              window.removeEventListener(ILLUSTRATIONS_LOADED, fill);
            }
          };
          window.addEventListener(ILLUSTRATIONS_LOADED, fill);
        }
        const caption = document.createElement('figcaption');
        caption.textContent = (node.attrs['caption'] as string) ?? '';
        figure.appendChild(caption);
        return { dom: figure };
      };
    },

    addCommands() {
      return {
        insertIllustration:
          (attrs) =>
          ({ chain }) =>
            chain()
              .insertContent([
                { type: this.name, attrs: { imageId: attrs.imageId, caption: attrs.caption?.trim() || null } },
                { type: 'paragraph' },
              ])
              .run(),
      };
    },
  });
}
