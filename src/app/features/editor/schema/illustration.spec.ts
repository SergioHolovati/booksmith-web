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
    expect(Object.keys(illustration.attrs!).sort()).toEqual(['align', 'caption', 'id', 'imageId', 'size']);
    expect(illustration.attrs).toMatchObject({ size: null, align: null });
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

  it('o autor escolhe o lugar na página e o lado; o editor mostra o DPI com as medidas do livro', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const urls = new Map([[IMAGE, '/media/x.png']]);
    const geometry = { pageWidthMm: 148, pageHeightMm: 210, textWidthMm: 114, textHeightMm: 168 };
    const editor = new Editor({ element: host, extensions: manuscriptExtensions('', undefined, () => urls, () => geometry) });
    editor.commands.setContent({ type: 'doc', content: [{ type: 'illustration', attrs: { imageId: IMAGE, caption: 'Mapa' } }] });

    const size = host.querySelector<HTMLSelectElement>('select[aria-label="Lugar da ilustração na página"]')!;
    expect(size.value).toBe('');
    size.value = 'small';
    size.dispatchEvent(new Event('change'));
    expect(editor.getJSON().content![0].attrs).toMatchObject({ size: 'small', align: null });
    expect([...host.querySelector('figure')!.classList]).toEqual(expect.arrayContaining(['illustration', 'size-small']));
    expect(host.querySelector('figure')!.classList.contains('align-right')).toBe(false);

    const side = host.querySelector<HTMLSelectElement>('select[aria-label="Lado da ilustração"]')!;
    side.value = 'right';
    side.dispatchEvent(new Event('change'));
    expect(editor.getJSON().content![0].attrs).toMatchObject({ size: 'small', align: 'right' });
    expect([...host.querySelector('figure')!.classList]).toEqual(expect.arrayContaining(['size-small', 'align-right']));

    // O DPI aparece quando a imagem carrega (2000 × 1500 numa página inteira do A5: 181)
    host.querySelector<HTMLSelectElement>('select[aria-label="Lugar da ilustração na página"]')!.value = 'bleed';
    host.querySelector('select')!.dispatchEvent(new Event('change'));
    const img = host.querySelector('img')!;
    Object.defineProperty(img, 'naturalWidth', { value: 2000 });
    Object.defineProperty(img, 'naturalHeight', { value: 1500 });
    img.dispatchEvent(new Event('load'));
    expect(host.querySelector('.illustration-dpi')!.textContent).toBe('Impressão: 181 DPI, pode sair borrada (o ideal é 300)');
    expect(host.querySelector('.illustration-note')!.textContent).toContain('legenda não aparece');
    editor.destroy();
    host.remove();
  });
});
