import { BookGenre } from '../../../core/models/api.models';

/** Um modelo de estrutura: o texto do sumário que ele preenche (o autor ajusta antes de criar). */
export interface OutlineTemplate {
  id: string;
  name: string;
  hint: string;
  /** Gêneros em que o modelo aparece primeiro. */
  genres: BookGenre[];
  text: string;
}

/** Repete um bloco N vezes: "Dia {n}" → Dia 1, Dia 2… */
function repeat(times: number, block: (n: number) => string): string {
  return Array.from({ length: times }, (_, i) => block(i + 1)).join('\n');
}

const SECTIONS = (titles: string[]) => titles.map((t) => `  ${t}`).join('\n');

const devotional = (days: number) => `Apresentação
Como usar este devocional
${repeat(days, (n) => `Dia ${n}\n${SECTIONS(['Versículo-chave', 'Reflexão', 'Oração', 'Para praticar hoje'])}`)}
Conclusão`;

export const OUTLINE_TEMPLATES: OutlineTemplate[] = [
  {
    id: 'devocional-30',
    name: 'Devocional de 30 dias',
    hint: 'Cada dia com versículo-chave, reflexão, oração e prática',
    genres: ['CHRISTIAN', 'SPIRITUAL'],
    text: devotional(30),
  },
  {
    id: 'devocional-40',
    name: 'Devocional de 40 dias',
    hint: 'Para jornadas de 40 dias (quaresma, jejum, propósito)',
    genres: ['CHRISTIAN', 'SPIRITUAL'],
    text: devotional(40),
  },
  {
    id: 'estudo-biblico',
    name: 'Estudo bíblico (8 lições)',
    hint: 'Para células, pequenos grupos e escola bíblica',
    genres: ['CHRISTIAN'],
    text: `Apresentação
Introdução
${repeat(8, (n) => `Lição ${n}\n${SECTIONS(['Texto base', 'Estudo', 'Para refletir', 'Perguntas para o grupo', 'Oração'])}`)}
Conclusão`,
  },
  {
    id: 'cristao-partes',
    name: 'Livro cristão em partes',
    hint: 'Apresentação, introdução, partes com capítulos e conclusão',
    genres: ['CHRISTIAN', 'SPIRITUAL'],
    text: `Apresentação
Introdução
Parte 1
${repeat(4, (n) => `Capítulo ${n}\n${SECTIONS([`${n}.1`, `${n}.2`, `${n}.3`])}`)}
Parte 2
${repeat(4, (n) => `Capítulo ${n + 4}\n${SECTIONS([`${n + 4}.1`, `${n + 4}.2`, `${n + 4}.3`])}`)}
Conclusão
Oração final`,
  },
  {
    id: 'autoajuda',
    name: 'Autoajuda (10 capítulos)',
    hint: 'Cada capítulo com ideia central, história, exercício e resumo',
    genres: ['SELF_HELP', 'SPIRITUAL'],
    text: `Introdução: como usar este livro
${repeat(10, (n) => `Capítulo ${n}\n${SECTIONS(['A ideia central', 'Uma história', 'Exercício', 'Resumo do capítulo'])}`)}
Conclusão: seu plano de ação`,
  },
  {
    id: 'didatico',
    name: 'Didático (6 unidades)',
    hint: 'Unidades com objetivos, conteúdo e exercícios; gabarito e glossário no fim',
    genres: ['EDUCATIONAL'],
    text: `Apresentação
${repeat(6, (n) => `Unidade ${n}\n${SECTIONS(['Objetivos', 'Conteúdo', 'Exemplos', 'Exercícios', 'Resumo'])}`)}
Gabarito
Glossário
Referências`,
  },
  {
    id: 'romance',
    name: 'Romance em três atos',
    hint: 'Prólogo, três partes e epílogo',
    genres: ['FICTION', 'OTHER'],
    text: `Prólogo
Parte 1 - O começo
${repeat(6, (n) => `Capítulo ${n}`)}
Parte 2 - O meio
${repeat(8, (n) => `Capítulo ${n + 6}`)}
Parte 3 - O fim
${repeat(6, (n) => `Capítulo ${n + 14}`)}
Epílogo`,
  },
];

/** Os modelos, com os do gênero do livro primeiro. */
export function templatesFor(genre: BookGenre | null | undefined): OutlineTemplate[] {
  if (!genre) {
    return OUTLINE_TEMPLATES;
  }
  const mine = OUTLINE_TEMPLATES.filter((t) => t.genres.includes(genre));
  return [...mine, ...OUTLINE_TEMPLATES.filter((t) => !t.genres.includes(genre))];
}
