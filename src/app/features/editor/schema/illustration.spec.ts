import { Editor } from '@tiptap/core';

import { ILLUSTRATIONS_LOADED } from './illustration';
import { manuscriptExtensions } from './manuscript-extensions';

const IMAGE = '0196f000-0000-7000-8000-00003f9a2c71';

describe('ilustração no texto', () => {
  it('o JSON tem só id do bloco, imageId e legenda (o que o servidor aceita) e não conta palavra', () => {
    const editor = new Editor({ element: document.createElement('div'), extensions: manuscriptExtensions('') });
    editor.commands.setContent({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Antes.' }] }] });
    editor.commands.setTextSelection(editor.state.doc.content.size);

    editor.commands.insertIllustration({ imageId: IMAGE, caption: '  O mapa de Vel  ' });

    const illustration = editor.getJSON().content!.find((n) => n.type === 'illustration')!;
    expect(Object.keys(illustration.attrs!).sort()).toEqual(['caption', 'id', 'imageId']);
    expect(illustration.attrs).toMatchObject({ imageId: IMAGE, caption: 'O mapa de Vel' });
    expect(illustration.attrs!['id']).toMatch(/^[A-Za-z0-9_-]{4,64}$/);
    expect(editor.getText().trim()).toBe('Antes.');
    editor.destroy();
  });

  it('mostra a imagem quando o endereço chega depois de abrir o capítulo', () => {
    const urls = new Map<string, string>();
    const host = document.createElement('div');
    document.body.appendChild(host);
    const editor = new Editor({ element: host, extensions: manuscriptExtensions('', undefined, () => urls) });
    editor.commands.setContent({ type: 'doc', content: [{ type: 'illustration', attrs: { imageId: IMAGE, caption: 'Mapa' } }] });
    expect(host.querySelector('figure img')).toBeNull();
    expect(host.querySelector('.illustration-missing')?.textContent).toBe('Ilustração');

    urls.set(IMAGE, '/media/gallery/mapa.png');
    window.dispatchEvent(new Event(ILLUSTRATIONS_LOADED));

    expect(host.querySelector('figure img')?.getAttribute('src')).toBe('/media/gallery/mapa.png');
    expect(host.querySelector('figcaption')?.textContent).toBe('Mapa');
    editor.destroy();
    host.remove();
  });
});
