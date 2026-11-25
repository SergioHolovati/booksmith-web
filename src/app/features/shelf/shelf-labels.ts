import { AiUse, Rating, ReportReason, WorkStatus } from '../../core/api/shelf.api';

/** Classificação indicativa (Brasil). 18 ainda não é aceita na Estante. */
export const RATINGS: Rating[] = ['L', '10', '12', '14', '16'];

export const RATING_LABEL: Record<Rating, string> = {
  L: 'Livre',
  '10': '10 anos',
  '12': '12 anos',
  '14': '14 anos',
  '16': '16 anos',
};

/** Avisos de conteúdo, no modelo do AO3: o leitor sabe antes de começar. */
export const WARNING_LABEL: Record<string, string> = {
  violence: 'Violência',
  death: 'Morte de personagem',
  self_harm: 'Autolesão',
  suicide: 'Suicídio',
  abuse: 'Abuso',
  drugs: 'Drogas',
  sexual_content: 'Conteúdo sexual (sem cenas explícitas)',
  strong_language: 'Linguagem forte',
  eating_disorder: 'Transtorno alimentar',
};

export const WARNINGS = Object.keys(WARNING_LABEL);

export const AI_USE_LABEL: Record<AiUse, string> = {
  none: 'Escrito pela pessoa',
  assisted: 'Com revisão ou ideias de IA',
  generated: 'Tem trechos gerados por IA',
};

export const STATUS_LABEL: Record<WorkStatus, string> = {
  ongoing: 'Em andamento',
  complete: 'Completa',
  hiatus: 'Em pausa',
};

export const REPORT_REASON_LABEL: Record<ReportReason, string> = {
  plagiarism: 'Plágio (cópia de outra obra)',
  rating: 'Classificação errada para o conteúdo',
  hate: 'Ódio ou discriminação',
  sexual: 'Conteúdo sexual impróprio',
  minor_safety: 'Risco a menores de idade',
  spam: 'Propaganda ou spam',
  other: 'Outro motivo',
};

export const REPORT_REASONS = Object.keys(REPORT_REASON_LABEL) as ReportReason[];

const NUMBER = new Intl.NumberFormat('pt-BR');

/** "12 mil palavras", "850 palavras". */
export function wordsLabel(words: number): string {
  if (words >= 1000) {
    return `${NUMBER.format(Math.round(words / 1000))} mil palavras`;
  }
  return `${NUMBER.format(words)} ${words === 1 ? 'palavra' : 'palavras'}`;
}

/** Minutos de leitura (~200 palavras por minuto), no mínimo 1. */
export function readingMinutes(words: number): number {
  return Math.max(1, Math.round(words / 200));
}

/** A idade da pessoa logada passa da classificação? (Sem login ou sem data, só mostra o aviso.) */
export function ratingAge(rating: Rating): number {
  return rating === 'L' ? 0 : Number(rating);
}
