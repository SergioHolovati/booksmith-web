import { IllustrationStyle } from '../../core/models/api.models';

/** Opção do formulário: o valor é o que o servidor aceita; o rótulo é o que a tela mostra. */
export interface Option {
  value: string;
  label: string;
}

/** Os mesmos estilos que o servidor conhece (IllustrationPrompt.STYLES). */
export const ART_STYLES: Option[] = [
  { value: 'watercolor', label: 'Aquarela' },
  { value: 'ink', label: 'Nanquim' },
  { value: 'pencil', label: 'Lápis' },
  { value: 'lineart', label: 'Traço fino' },
  { value: 'anime', label: 'Anime/mangá' },
  { value: 'comic', label: 'Quadrinho' },
  { value: 'cartoon', label: 'Cartoon' },
  { value: 'childrens', label: 'Livro infantil' },
  { value: 'realistic', label: 'Realista' },
  { value: 'digital', label: 'Pintura digital' },
  { value: 'oil', label: 'Pintura a óleo' },
  { value: 'celshading', label: 'Cel shading' },
  { value: 'pixel', label: 'Pixel art' },
  { value: 'woodcut', label: 'Xilogravura' },
];

export const PALETTES: Option[] = [
  { value: 'warm', label: 'Quente' },
  { value: 'cool', label: 'Fria' },
  { value: 'neutral', label: 'Neutra' },
  { value: 'vibrant', label: 'Vibrante' },
  { value: 'pastel', label: 'Pastel' },
];

export const DETAILS: Option[] = [
  { value: 'simple', label: 'Simples' },
  { value: 'medium', label: 'Médio' },
  { value: 'rich', label: 'Detalhado' },
];

export const BACKGROUNDS: Option[] = [
  { value: 'scene', label: 'Com cenário' },
  { value: 'plain', label: 'Fundo liso' },
  { value: 'white', label: 'Fundo branco' },
];

export const FRAMINGS: Option[] = [
  { value: 'face', label: 'Rosto' },
  { value: 'half', label: 'Meio corpo' },
  { value: 'full', label: 'Corpo inteiro' },
];

export const EXPRESSIONS: Option[] = [
  { value: 'neutral', label: 'Neutra' },
  { value: 'smile', label: 'Sorriso' },
  { value: 'laugh', label: 'Rindo' },
  { value: 'serious', label: 'Séria' },
  { value: 'thoughtful', label: 'Pensativa' },
  { value: 'smirk', label: 'Confiante' },
  { value: 'surprise', label: 'Surpresa' },
  { value: 'sad', label: 'Triste' },
  { value: 'angry', label: 'Com raiva' },
  { value: 'fear', label: 'Com medo' },
];

/** Formato da cena no livro (o servidor escolhe o tamanho da imagem). */
export const FORMATS: Option[] = [
  { value: 'page', label: 'Página inteira (em pé)' },
  { value: 'opening', label: 'Abertura de capítulo (deitada)' },
  { value: 'vignette', label: 'Vinheta (quadrada)' },
];

export const MAX_SCENE = 600;
export const MAX_EXTRA = 300;
export const MAX_SCENE_CHARACTERS = 4;

export const DEFAULT_STYLE: IllustrationStyle = {
  art: 'watercolor',
  color: true,
  palette: 'warm',
  detail: 'medium',
  background: 'scene',
};

const STORAGE_PREFIX = 'booksmith.illustration-style.';

/** O estilo do universo: o último usado, para as ilustrações saírem coerentes entre si. */
export function savedStyle(universeId: string): IllustrationStyle {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + universeId);
    const parsed = raw ? (JSON.parse(raw) as Partial<IllustrationStyle>) : {};
    return {
      art: valid(ART_STYLES, parsed.art) ?? DEFAULT_STYLE.art,
      color: typeof parsed.color === 'boolean' ? parsed.color : DEFAULT_STYLE.color,
      palette: valid(PALETTES, parsed.palette) ?? DEFAULT_STYLE.palette,
      detail: valid(DETAILS, parsed.detail) ?? DEFAULT_STYLE.detail,
      background: valid(BACKGROUNDS, parsed.background) ?? DEFAULT_STYLE.background,
    };
  } catch {
    return { ...DEFAULT_STYLE };
  }
}

export function saveStyle(universeId: string, style: IllustrationStyle): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + universeId, JSON.stringify(style));
  } catch {
    // sem armazenamento: o estilo volta ao padrão na próxima vez
  }
}

/** "Volta a ter vaga em 17/11 às 14h" para o fim do limite semanal. */
export function nextSlot(nextAt: string | null): string {
  if (!nextAt) {
    return '';
  }
  const date = new Date(nextAt);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const day = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  const hour = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `Volta a ter vaga em ${day} às ${hour}.`;
}

function valid(options: Option[], value: unknown): string | null {
  return typeof value === 'string' && options.some((o) => o.value === value) ? value : null;
}
