import { Node, mergeAttributes } from '@tiptap/core';

import {
  ILLUSTRATION_ALIGNS,
  ILLUSTRATION_SIZES,
  IllustrationAlign,
  IllustrationSize,
  PrintGeometry,
  dpiHint,
  printDpi,
} from '../../../core/util/print-geometry';

/** Evento disparado quando os endereços das imagens chegam (o capítulo abre antes). */
export const ILLUSTRATIONS_LOADED = 'booksmith:illustrations-loaded';

/** Endereço de cada imagem da biblioteca do universo (id → URL), para o editor desenhar a ilustração. */
export type IllustrationSource = () => Map<string, string>;

/** As medidas da página do livro (diagramação), para dizer o DPI de cada ilustração; null = ainda não chegou. */
export type PrintGeometrySource = () => PrintGeometry | null;

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    illustration: {
      insertIllustration: (attrs: { imageId: string; caption?: string | null }) => ReturnType;
    };
  }
}

const SIDE_SIZES = new Set<string>(['small', 'medium']);
const FULL_PAGE = new Set<string>(['bleed', 'spread']);

/** "illustration size-small align-left"; sem lugar escolhido, só "illustration" (como antes). */
export function figureClass(size: string | null, align: string | null): string {
  if (!size) {
    return 'illustration';
  }
  const side = SIDE_SIZES.has(size) && (align === 'left' || align === 'right') ? ` align-${align}` : '';
  return `illustration size-${size}${side}`;
}

function select<T extends string>(label: string, options: { value: T; label: string }[], value: string, auto?: string) {
  const el = document.createElement('select');
  el.className = 'illustration-select';
  el.setAttribute('aria-label', label);
  if (auto) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = auto;
    el.appendChild(option);
  }
  for (const o of options) {
    const option = document.createElement('option');
    option.value = o.value;
    option.textContent = o.label;
    el.appendChild(option);
  }
  el.value = value;
  return el;
}

/**
 * Ilustração no texto (§4.4 do produto): uma imagem da biblioteca do universo com legenda opcional e o lugar na
 * página (`size`: pequena, média, largura do texto, página só dela, até a borda, página dupla; `align` para as
 * pequenas e médias). É o que o servidor aceita (ManuscriptDocument). Sai no ePub, no PDF (com página própria para
 * as de página inteira) e no Word (a imagem de verdade). Embaixo da figura, o editor mostra o lugar e o DPI que ela
 * terá impressa, com as medidas da diagramação do livro.
 */
export function illustrationExtension(source?: IllustrationSource, geometry?: PrintGeometrySource) {
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
        size: {
          default: null,
          parseHTML: (el) => el.getAttribute('data-size'),
          renderHTML: (a) => (a['size'] ? { 'data-size': a['size'] } : {}),
        },
        align: {
          default: null,
          parseHTML: (el) => el.getAttribute('data-align'),
          renderHTML: (a) => (a['align'] ? { 'data-align': a['align'] } : {}),
        },
      };
    },

    parseHTML() {
      return [{ tag: 'figure[data-image]' }];
    },

    renderHTML({ node, HTMLAttributes }) {
      const caption = (node.attrs['caption'] as string | null) ?? '';
      const css = figureClass(node.attrs['size'] as string | null, node.attrs['align'] as string | null);
      return ['figure', mergeAttributes(HTMLAttributes, { class: css }), ['figcaption', caption]];
    },

    addNodeView() {
      return ({ node, editor, getPos }) => {
        const size = node.attrs['size'] as IllustrationSize | null;
        const align = node.attrs['align'] as IllustrationAlign | null;
        const captionText = (node.attrs['caption'] as string) ?? '';
        const figure = document.createElement('figure');
        figure.className = figureClass(size, align);
        figure.setAttribute('data-image', String(node.attrs['imageId']));

        const tools = document.createElement('div');
        tools.className = 'illustration-tools';
        tools.contentEditable = 'false';
        const hint = document.createElement('span');
        hint.className = 'illustration-dpi';

        const showDpi = (img: HTMLImageElement) => {
          const g = geometry?.();
          if (!g || !img.naturalWidth || !img.naturalHeight) {
            hint.textContent = '';
            return;
          }
          const { dpi } = printDpi(size, img.naturalWidth, img.naturalHeight, g, !!captionText);
          const h = dpiHint(dpi);
          hint.textContent = h.text;
          hint.classList.toggle('low', !h.ok);
        };

        const image = (url: string) => {
          const img = document.createElement('img');
          img.src = url;
          img.alt = captionText || 'Ilustração';
          img.draggable = false;
          img.addEventListener('load', () => showDpi(img));
          return img;
        };

        const url = source?.().get(node.attrs['imageId'] as string);
        if (url) {
          figure.appendChild(image(url));
        } else {
          const missing = document.createElement('div');
          missing.className = 'illustration-missing';
          missing.textContent = 'Ilustração';
          figure.appendChild(missing);
          // A lista de imagens chega depois que o capítulo abre: quando chegar, troca o aviso pela imagem
          const fill = () => {
            const late = source?.().get(node.attrs['imageId'] as string);
            if (late && missing.isConnected) {
              missing.replaceWith(image(late));
              window.removeEventListener(ILLUSTRATIONS_LOADED, fill);
            }
          };
          window.addEventListener(ILLUSTRATIONS_LOADED, fill);
        }
        const caption = document.createElement('figcaption');
        caption.textContent = captionText;
        figure.appendChild(caption);

        if (editor.isEditable) {
          const update = (attrs: Record<string, unknown>) => {
            const pos = typeof getPos === 'function' ? getPos() : undefined;
            if (typeof pos !== 'number') {
              return;
            }
            editor.chain().command(({ tr }) => {
              tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...attrs });
              return true;
            }).run();
          };
          const sizeSelect = select('Lugar da ilustração na página', ILLUSTRATION_SIZES, size ?? '', 'Automático');
          sizeSelect.addEventListener('change', () => update({ size: sizeSelect.value || null }));
          tools.appendChild(sizeSelect);
          if (size && SIDE_SIZES.has(size)) {
            const alignSelect = select('Lado da ilustração', ILLUSTRATION_ALIGNS, align ?? 'center');
            alignSelect.addEventListener('change', () => update({ align: alignSelect.value === 'center' ? null : alignSelect.value }));
            tools.appendChild(alignSelect);
          }
          tools.appendChild(hint);
          if (size && FULL_PAGE.has(size) && captionText) {
            const note = document.createElement('span');
            note.className = 'illustration-note';
            note.textContent = 'Até a borda, a legenda não aparece no PDF.';
            tools.appendChild(note);
          }
          figure.appendChild(tools);
        }
        return {
          dom: figure,
          // Os seletores são do autor, não do editor de texto
          stopEvent: (event: Event) => tools.contains(event.target as globalThis.Node),
          ignoreMutation: () => true,
        };
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
