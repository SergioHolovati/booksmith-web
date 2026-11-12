import { BookDetail, PrintCheckIllustration, Publishing, PublishingDestination, PublishingStep } from '../../../core/models/api.models';
import { printCheckSummary } from '../print-check';

/** Para onde o livro vai. O site abre numa aba nova; a gráfica é a que o autor escolher. */
export const DESTINATIONS: { value: PublishingDestination; label: string; hint: string; site: string | null }[] = [
  { value: 'kdp', label: 'Amazon KDP', hint: 'Impresso e e-book na Amazon', site: 'https://kdp.amazon.com' },
  { value: 'clube', label: 'Clube de Autores', hint: 'Impressão sob demanda e e-book', site: 'https://clubedeautores.com.br' },
  { value: 'uiclap', label: 'UICLAP', hint: 'Impressão sob demanda', site: 'https://uiclap.com' },
  { value: 'grafica', label: 'Gráfica', hint: 'Uma tiragem numa gráfica', site: null },
];

/** Regras do KDP que o app confere (as mesmas da capa para gráfica). */
export const KDP_TRIMS = ['a5', '6x9'];
export const KDP_MIN_PAGES = 24;
export const KDP_DESCRIPTION_MAX = 4000;
export const MAX_KEYWORDS = 7;

const TRIM_LABEL: Record<string, string> = { a5: 'A5', '14x21': '14×21', '16x23': '16×23', '6x9': '6×9"' };

export const EMPTY_PUBLISHING: Publishing = { destination: null, isbnPrint: null, isbnEbook: null, keywords: [], done: [] };

/**
 * ok: feito (o app conferiu ou o autor marcou). todo: falta. warn: tem algo errado para o destino.
 * info: o app não confere; é só o caminho.
 */
export type ItemStatus = 'ok' | 'todo' | 'warn' | 'info';

export interface GuideItem {
  key: string;
  title: string;
  detail: string;
  status: ItemStatus;
  /** Onde resolver no app. */
  route?: string[];
  routeLabel?: string;
  /** Passo que o autor marca como feito (o app não tem como saber). */
  step?: PublishingStep;
}

export interface GuideSection {
  title: string;
  items: GuideItem[];
}

/** O que o app guarda, sempre com as listas (livro antigo vem com "{}"). */
export function normalizePublishing(value: Partial<Publishing> | null | undefined): Publishing {
  return {
    destination: value?.destination ?? null,
    isbnPrint: value?.isbnPrint ?? null,
    isbnEbook: value?.isbnEbook ?? null,
    keywords: value?.keywords ?? [],
    done: value?.done ?? [],
  };
}

/** Só os números do ISBN. */
export function isbnDigits(isbn: string): string {
  return isbn.replace(/[^0-9]/g, '');
}

/** O mesmo que o servidor confere: 13 números, 978 ou 979, dígito verificador certo. null = está certo (ou vazio). */
export function isbnProblem(text: string | null): string | null {
  const isbn = (text ?? '').trim().replace(/^isbn[:\s]*/i, '');
  if (!isbn) {
    return null;
  }
  if (!/^[0-9][0-9 -]*[0-9]$/.test(isbn)) {
    return 'Use só números e hífens.';
  }
  const digits = isbnDigits(isbn);
  if (digits.length !== 13) {
    return `São 13 números; aqui há ${digits.length}.`;
  }
  if (!digits.startsWith('978') && !digits.startsWith('979')) {
    return 'O ISBN começa com 978 ou 979.';
  }
  const sum = [...digits].reduce((total, d, i) => total + Number(d) * (i % 2 === 0 ? 1 : 3), 0);
  return sum % 10 === 0 ? null : 'O último número não confere: algum número ficou trocado.';
}

function stepItem(publishing: Publishing, step: PublishingStep, title: string, detail: string, route?: string[], routeLabel?: string): GuideItem {
  return { key: step, title, detail, status: publishing.done.includes(step) ? 'ok' : 'todo', step, route, routeLabel };
}

/**
 * O checklist do livro para o destino escolhido. {@code pages}: páginas do miolo na diagramação (null = ainda
 * contando). {@code illustrations}: as ilustrações do texto com o DPI na diagramação (null = ainda conferindo). Os textos dizem o que fazer e onde; o que muda com o tempo (preço do ISBN, tamanhos de cada
 * plataforma) fica para conferir no site oficial.
 */
export function guideSections(
  book: BookDetail,
  publishing: Publishing,
  pages: number | null,
  illustrations: PrintCheckIllustration[] | null = [],
): GuideSection[] {
  const destination = publishing.destination;
  const kdp = destination === 'kdp';
  const site = DESTINATIONS.find((d) => d.value === destination);
  const words = book.chapters.reduce((total, c) => total + c.wordCount, 0);
  const synopsis = book.synopsis?.trim() ?? '';
  const trim = book.layout?.trim ?? 'a5';
  const id = book.id;

  const text: GuideItem[] = [
    {
      key: 'chapters',
      title: 'O texto',
      detail: words > 0
        ? `${book.chapters.length} ${book.chapters.length === 1 ? 'capítulo' : 'capítulos'}, ${words.toLocaleString('pt-BR')} palavras. Antes de enviar, rode a revisão de cada capítulo.`
        : 'Escreva ou importe os capítulos.',
      status: words > 0 ? 'ok' : 'todo',
      route: ['/books', id],
      routeLabel: 'Capítulos',
    },
    {
      key: 'synopsis',
      title: 'Sinopse',
      detail: !synopsis
        ? 'Vai na página do livro na loja e na contracapa.'
        : kdp && synopsis.length > KDP_DESCRIPTION_MAX
          ? `O KDP aceita até ${KDP_DESCRIPTION_MAX.toLocaleString('pt-BR')} caracteres na descrição; a sinopse tem ${synopsis.length.toLocaleString('pt-BR')}.`
          : 'Pronta. A revisão dos textos do livro confere ortografia e nomes.',
      status: !synopsis ? 'todo' : kdp && synopsis.length > KDP_DESCRIPTION_MAX ? 'warn' : 'ok',
      route: ['/books', id, 'edit'],
      routeLabel: 'Editar',
    },
    {
      key: 'about',
      title: 'Sobre o autor',
      detail: book.pages?.aboutAuthor ? 'Pronto: sai no fim do livro.' : 'Opcional, mas as lojas e os leitores gostam de saber quem escreveu.',
      status: book.pages?.aboutAuthor ? 'ok' : 'todo',
      route: ['/books', id, 'paginas'],
      routeLabel: 'Páginas',
    },
  ];

  const kdpTrim = !kdp || KDP_TRIMS.includes(trim);
  const fewPages = kdp && pages !== null && pages < KDP_MIN_PAGES;
  const files: GuideItem[] = [
    {
      key: 'layout',
      title: `Tamanho ${TRIM_LABEL[trim] ?? trim}`,
      detail: !kdpTrim
        ? 'O KDP não imprime neste tamanho. Na diagramação, escolha A5 ou 6×9.'
        : kdp
          ? 'O KDP imprime neste tamanho.'
          : `Confira se ${site?.label ?? 'a gráfica'} imprime em ${TRIM_LABEL[trim] ?? trim} antes de enviar.`,
      status: kdpTrim ? (kdp ? 'ok' : 'info') : 'warn',
      route: ['/books', id, 'diagramacao'],
      routeLabel: 'Diagramação',
    },
    {
      key: 'pages',
      title: pages === null ? 'Contando as páginas…' : `${pages} páginas`,
      detail: fewPages
        ? `O KDP imprime a partir de ${KDP_MIN_PAGES} páginas.`
        : 'A lombada da capa depende deste número: gere a capa aberta com o texto final.',
      status: pages === null ? 'info' : fewPages ? 'warn' : 'ok',
    },
    ...illustrationItems(illustrations),
    {
      key: 'cover',
      title: 'Capa',
      detail: book.coverUrl ? 'A frente está pronta: vale no e-book e na loja.' : 'Faça a capa no editor ou importe a sua.',
      status: book.coverUrl ? 'ok' : 'todo',
      route: ['/books', id, 'capa'],
      routeLabel: 'Capa',
    },
    {
      key: 'print-cover',
      title: 'Capa aberta para impressão',
      detail: 'Contracapa, lombada e frente num PDF só, nas medidas da gráfica.',
      status: 'info',
      route: ['/books', id, 'capa', 'grafica'],
      routeLabel: 'Capa para gráfica',
    },
    {
      key: 'files',
      title: 'Miolo em PDF e e-book',
      detail: 'Baixe o PDF diagramado (miolo) e o ePub com o texto de agora.',
      status: 'info',
      route: ['/books', id, 'export'],
      routeLabel: 'Baixar',
    },
  ];

  const isbnDone = !!publishing.isbnPrint || (kdp && publishing.done.includes('isbn-kdp'));
  const register: GuideItem[] = [
    {
      key: 'isbn',
      title: 'ISBN',
      detail: kdp
        ? 'O KDP dá um ISBN grátis para o impresso, que só vale na Amazon; o e-book na Amazon não precisa. Com ISBN próprio, digite abaixo.'
        : 'O ISBN é emitido pela Agência Brasileira do ISBN (Câmara Brasileira do Livro), com taxa por número. Cada formato tem o seu. Pergunte à plataforma se ela fornece um.',
      status: isbnDone ? 'ok' : 'todo',
    },
    ...(kdp ? [stepItem(publishing, 'isbn-kdp', 'Vou usar o ISBN grátis do KDP', 'Marque se não for comprar um ISBN próprio. A escolha não muda depois de publicar.')] : []),
    stepItem(publishing, 'ficha', 'Ficha catalográfica',
      'Feita por um bibliotecário (CRB), com o ISBN. Vai no verso da folha de rosto: cole o texto nos créditos.',
      ['/books', id, 'paginas'], 'Créditos'),
  ];

  const store: GuideItem[] = [
    {
      key: 'keywords',
      title: 'Palavras-chave',
      detail: `${publishing.keywords.length} de ${MAX_KEYWORDS}. Pense no que o leitor digitaria na busca: gênero, tema, época, lugar.`,
      status: publishing.keywords.length > 0 ? 'ok' : 'todo',
    },
    stepItem(publishing, 'conta', site?.site ? `Conta no ${site.label}` : 'Gráfica escolhida',
      site?.site ? 'Crie a conta e preencha os dados para receber.' : 'Peça orçamento a mais de uma e mande as medidas da capa.'),
    stepItem(publishing, 'envio', 'Arquivos enviados', 'O miolo em PDF e a capa aberta; no e-book, o ePub e a capa.'),
    stepItem(publishing, 'prova', 'Prova impressa conferida', 'Peça um exemplar e leia no papel antes de liberar a venda: é onde aparece o que passou na tela.'),
    stepItem(publishing, 'preco', 'Preço e lojas definidos', 'Some o custo de impressão e a parte da loja; confira o valor que sobra para você.'),
  ];

  const after: GuideItem[] = [
    stepItem(publishing, 'deposito', 'Depósito legal na Biblioteca Nacional',
      'Pela Lei 10.994/2004, mande pelo menos 1 exemplar à Biblioteca Nacional em até 30 dias depois de publicar. Não tem taxa; o envio é por sua conta.'),
  ];

  return [
    { title: 'O livro', items: text },
    { title: 'Os arquivos', items: files },
    { title: 'Registro', items: register },
    { title: 'Na loja', items: store },
    { title: 'Depois de publicar', items: after },
  ];
}

/** As ilustrações para impressão (300 DPI); sem ilustração no texto, o item não aparece. */
function illustrationItems(illustrations: PrintCheckIllustration[] | null): GuideItem[] {
  if (illustrations === null) {
    return [{ key: 'illustrations', title: 'Conferindo as ilustrações…', detail: 'Em que tamanho cada uma sai na página.', status: 'info' }];
  }
  if (!illustrations.length) {
    return [];
  }
  const problem = printCheckSummary(illustrations);
  const count = illustrations.length === 1 ? '1 ilustração' : `${illustrations.length} ilustrações`;
  return [{
    key: 'illustrations',
    title: 'Ilustrações',
    detail: problem ?? `${count} com 300 DPI ou mais: saem nítidas na impressão.`,
    status: problem ? 'warn' : 'ok',
  }];
}

/** Quanto do caminho já está feito (o que é só informação não conta). */
export function progress(sections: GuideSection[]): { done: number; total: number } {
  const items = sections.flatMap((s) => s.items).filter((i) => i.status !== 'info');
  return { done: items.filter((i) => i.status === 'ok').length, total: items.length };
}
