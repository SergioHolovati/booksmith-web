/**
 * As fontes do texto do livro (as mesmas do servidor, {@code BookFont}): todas livres (OFL). No app, a prévia usa o
 * Google Fonts (já liberado na CSP); no livro baixado, o servidor embute os arquivos.
 */
export interface BookFontOption {
  id: string;
  family: string;
  /** Uma linha: para que serve. */
  hint: string;
  /** Pensada para o livro infantil. */
  children: boolean;
  /** Família genérica de reserva. */
  fallback: 'serif' | 'sans-serif' | 'cursive';
  /** O pedido ao Google Fonts (pesos e itálicos que existem). */
  query: string;
}

export const DEFAULT_FONT = 'literata';

export const BOOK_FONTS: BookFontOption[] = [
  { id: 'literata', family: 'Literata', hint: 'A padrão: feita para ler livros', children: false, fallback: 'serif', query: 'Literata:ital,wght@0,400;0,700;1,400;1,700' },
  { id: 'lora', family: 'Lora', hint: 'Elegante, boa para romance', children: false, fallback: 'serif', query: 'Lora:ital,wght@0,400;0,700;1,400;1,700' },
  { id: 'eb-garamond', family: 'EB Garamond', hint: 'Clássica, de livro antigo', children: false, fallback: 'serif', query: 'EB+Garamond:ital,wght@0,400;0,700;1,400;1,700' },
  { id: 'merriweather', family: 'Merriweather', hint: 'Robusta, lê bem em letra pequena', children: false, fallback: 'serif', query: 'Merriweather:ital,wght@0,400;0,700;1,400;1,700' },
  { id: 'atkinson', family: 'Atkinson Hyperlegible', hint: 'Para quem enxerga pouco', children: false, fallback: 'sans-serif', query: 'Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400;1,700' },
  { id: 'lexend', family: 'Lexend', hint: 'Leitura fluida, sem serifa', children: false, fallback: 'sans-serif', query: 'Lexend:wght@400;700' },
  { id: 'andika', family: 'Andika', hint: 'Letra de escola: para quem está aprendendo a ler', children: true, fallback: 'sans-serif', query: 'Andika:ital,wght@0,400;0,700;1,400;1,700' },
  { id: 'nunito', family: 'Nunito', hint: 'Arredondada e clara', children: true, fallback: 'sans-serif', query: 'Nunito:ital,wght@0,400;0,700;1,400;1,700' },
  { id: 'fredoka', family: 'Fredoka', hint: 'Redondinha e divertida', children: true, fallback: 'sans-serif', query: 'Fredoka:wght@400;700' },
  { id: 'baloo', family: 'Baloo 2', hint: 'Gordinha, alegre, para títulos e frases curtas', children: true, fallback: 'sans-serif', query: 'Baloo+2:wght@400;700' },
  { id: 'patrick-hand', family: 'Patrick Hand', hint: 'Escrita à mão', children: true, fallback: 'cursive', query: 'Patrick+Hand' },
  { id: 'comic-neue', family: 'Comic Neue', hint: 'Gibi, leve e simpática', children: true, fallback: 'cursive', query: 'Comic+Neue:ital,wght@0,400;0,700;1,400;1,700' },
];

export function bookFont(id: string | null | undefined): BookFontOption {
  return BOOK_FONTS.find((f) => f.id === id) ?? BOOK_FONTS[0];
}

/** O valor de font-family do CSS para a fonte. */
export function fontFamilyCss(id: string | null | undefined): string {
  const font = bookFont(id);
  return `'${font.family}', ${font.fallback}`;
}

const loaded = new Set<string>();

/** Carrega as fontes para a prévia (uma vez por família; a Literata já vem no app). */
export function loadBookFonts(ids: (string | null | undefined)[], doc: Document = document): void {
  const missing = [...new Set(ids.map((id) => bookFont(id)))].filter((f) => f.id !== DEFAULT_FONT && !loaded.has(f.id));
  if (!missing.length) {
    return;
  }
  missing.forEach((f) => loaded.add(f.id));
  const link = doc.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?${missing.map((f) => `family=${f.query}`).join('&')}&display=swap`;
  doc.head.appendChild(link);
}
