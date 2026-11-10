/**
 * Central de ajuda: artigos curtos, no próprio app (funcionam offline pelo service worker, junto com o código).
 * Cada bloco é texto simples; `**negrito**` é o único destaque. Ao mudar uma tela, revise o artigo dela.
 */
export type HelpBlock = { p: string } | { h: string } | { steps: string[] } | { list: string[] };

export interface HelpArticle {
  slug: string;
  title: string;
  /** Uma linha, na lista e na busca. */
  summary: string;
  topic: HelpTopic;
  /** Palavras que alguém usaria para procurar ("sumiu", "apagou"). */
  keywords: string[];
  body: HelpBlock[];
}

export type HelpTopic = 'texto' | 'livros' | 'universo' | 'conta';

export const HELP_TOPICS: Record<HelpTopic, { label: string; icon: string }> = {
  texto: { label: 'Seu texto', icon: 'pi-pencil' },
  livros: { label: 'Livros, importar e exportar', icon: 'pi-book' },
  universo: { label: 'Universo e personagens', icon: 'pi-globe' },
  conta: { label: 'Conta e aparelhos', icon: 'pi-user' },
};

export const HELP_ARTICLES: HelpArticle[] = [
  {
    slug: 'texto-sumiu',
    title: 'Meu texto sumiu',
    summary: 'Onde procurar antes de qualquer coisa: histórico de versões, lixeira e o rascunho do aparelho.',
    topic: 'texto',
    keywords: ['sumiu', 'perdi', 'apagou', 'desapareceu', 'perdido', 'recuperar', 'voltar'],
    body: [
      { p: 'Quase sempre o texto ainda está aqui. Procure nesta ordem:' },
      {
        steps: [
          '**Histórico do capítulo:** no editor, toque no relógio ("Histórico de versões"). O Booksmith guarda versões automáticas enquanto você escreve. Abra uma para ver e toque em **Restaurar**.',
          '**Lixeira:** em Perfil → Lixeira estão os livros, capítulos, personagens, lugares e imagens excluídos nos últimos 30 dias. Toque em **Restaurar**.',
          '**O outro aparelho:** se você escreveu sem internet, o texto fica guardado naquele aparelho e sobe quando ele se conectar. Abra o Booksmith nele com internet.',
        ],
      },
      { p: 'Não achou? Fale com o suporte escolhendo o assunto **"Meu texto sumiu"**: esses pedidos têm prioridade.' },
    ],
  },
  {
    slug: 'salvamento-e-offline',
    title: 'Salvamento automático e escrita sem internet',
    summary: 'Como o texto é salvo, o que acontece sem sinal e quando dois aparelhos editam o mesmo capítulo.',
    topic: 'texto',
    keywords: ['salvar', 'salvo', 'offline', 'sem internet', 'conflito', 'sincronizar', 'autosave'],
    body: [
      { p: 'Você não precisa salvar: o editor envia o texto sozinho alguns segundos depois de você parar de digitar. O aviso no editor mostra **Salvando…**, **Salvo** ou, sem internet, **Sem conexão — salvo no aparelho**.' },
      { h: 'Sem internet' },
      { p: 'Pode continuar escrevendo. O texto fica guardado no aparelho e sobe quando a conexão voltar. Não limpe os dados do navegador enquanto houver texto esperando para subir.' },
      { h: 'Dois aparelhos no mesmo capítulo' },
      { p: 'Se o capítulo também foi salvo em outro aparelho, o Booksmith avisa e pergunta: **Manter o que escrevi aqui** ou **Usar a versão do outro aparelho**. Nada é sobrescrito sem você decidir, e uma cópia da versão descartada fica guardada no aparelho.' },
    ],
  },
  {
    slug: 'meta-diaria',
    title: 'Meta diária e sequência de dias',
    summary: 'Escolha quantas palavras quer escrever por dia e acompanhe a sequência.',
    topic: 'texto',
    keywords: ['meta', 'palavras por dia', 'sequência', 'streak', 'hábito', 'contador', 'objetivo'],
    body: [
      { steps: ['No **Início**, no cartão "Escrita de hoje", toque em **Definir uma meta diária**.', 'Escolha 250, 500, 1.000 ou 2.000 palavras, ou digite outro número.', 'Toque em **Salvar meta**.'] },
      { p: 'No editor, ao lado da contagem de palavras, aparece quanto falta (ex.: **312 de 500 hoje**), e o Booksmith avisa quando você bate a meta.' },
      { p: 'Só conta o que você escreve no editor: importar um arquivo ou restaurar uma versão não. Apagar texto desconta. O dia vira à meia-noite do seu aparelho.' },
      { p: 'A **sequência** são os dias seguidos com a meta batida. Ela só quebra quando um dia acaba sem a meta. Sem meta, qualquer dia com escrita conta.' },
    ],
  },
  {
    slug: 'versoes',
    title: 'Voltar para uma versão antiga do capítulo',
    summary: 'Versões automáticas, versões com nome e como restaurar sem perder a atual.',
    topic: 'texto',
    keywords: ['versão', 'histórico', 'antiga', 'desfazer', 'restaurar', 'backup'],
    body: [
      { p: 'Enquanto você escreve, o Booksmith guarda versões do capítulo: a cada 10 minutos de trabalho ou quando o texto muda bastante (500 palavras ou mais).' },
      {
        steps: [
          'No editor, toque no relógio ("Histórico de versões").',
          'Para marcar um ponto importante, dê um nome e toque em **Salvar versão agora**.',
          'Para voltar, abra a versão, confira a prévia e toque em **Restaurar**.',
        ],
      },
      { p: 'Restaurar é seguro: antes, o texto atual vira uma versão também. Dá para desfazer a restauração.' },
    ],
  },
  {
    slug: 'lixeira',
    title: 'Recuperar algo excluído',
    summary: 'Tudo o que você exclui fica 30 dias na lixeira.',
    topic: 'texto',
    keywords: ['lixeira', 'excluí', 'apaguei', 'deletei', 'restaurar', '30 dias'],
    body: [
      { p: 'Livros, capítulos, personagens, lugares, fichas do mundo, eventos da linha do tempo, relações e imagens vão para a lixeira quando você exclui. Ficam lá por **30 dias**; depois somem de vez.' },
      { steps: ['Abra Perfil → **Lixeira**.', 'Toque em **Restaurar** no item.'] },
      { p: 'Um capítulo volta para o fim do livro. Uma relação só volta depois que os dois personagens estiverem de volta.' },
    ],
  },
  {
    slug: 'importar',
    title: 'Importar um livro do Word, LibreOffice ou Markdown',
    summary: 'Arquivos .docx, .odt, .md e .txt, divididos em capítulos automaticamente.',
    topic: 'livros',
    keywords: ['importar', 'word', 'docx', 'odt', 'libreoffice', 'markdown', 'txt', 'arquivo', 'pdf'],
    body: [
      { steps: ['Abra o livro e toque em **Importar**.', 'Escolha o arquivo.', 'Confira a prévia: cada título vira um capítulo.', 'Confirme.'] },
      { p: 'Aceitamos **.docx** (Word, Google Docs), **.odt** (LibreOffice), **.md** e **.txt**. Arquivos .doc antigos, PDF e RTF não: abra no Word ou no LibreOffice e salve como .docx.' },
      { p: 'Os títulos com estilo (Título 1, 2 ou 3 no Word e no LibreOffice, # no Markdown) separam os capítulos. Sem estilo, o Booksmith procura linhas como "Capítulo 3", "Prólogo" e "Epílogo". Linhas só com ***, ### ou ~~~ viram quebra de cena.' },
    ],
  },
  {
    slug: 'exportar',
    title: 'Baixar o livro em ePub, PDF ou Word',
    summary: 'Para ler no Kindle ou celular, imprimir ou mandar para revisão.',
    topic: 'livros',
    keywords: ['exportar', 'epub', 'pdf', 'word', 'kindle', 'baixar', 'download', 'imprimir'],
    body: [
      { p: 'Abra o livro e toque em **Baixar** (aparece quando o livro tem capítulos). Você escolhe:' },
      {
        list: [
          '**ePub:** para leitores digitais e apps de leitura.',
          '**PDF:** para ler ou imprimir, em tamanho de livro (A5).',
          '**Word:** no formato de manuscrito, para revisão. Volta igual se você importar de novo.',
        ],
      },
      { p: 'O arquivo é gerado na hora, com a versão mais recente do texto.' },
    ],
  },
  {
    slug: 'universos',
    title: 'Universos, séries e personagens compartilhados',
    summary: 'Vários livros no mesmo mundo, com os mesmos personagens, lugares e linha do tempo.',
    topic: 'universo',
    keywords: ['universo', 'série', 'saga', 'continuação', 'mundo', 'compartilhar', 'juntar'],
    body: [
      { p: 'Todo livro vive num universo. Para uma série, crie os livros seguintes **no mesmo universo**: em Universos, toque em **Novo livro neste universo**. Personagens, lugares, linha do tempo, mapa e imagens ficam disponíveis para todos.' },
      { p: 'Já tem um livro em outro universo? Abra o livro, toque em **Editar** e escolha o universo da série. Os personagens, lugares e a linha do tempo dele vão junto, e o Booksmith avisa se houver nomes repetidos.' },
    ],
  },
  {
    slug: 'imagens',
    title: 'Imagens e retratos',
    summary: 'Fotos de referência, desenhos e o retrato de cada personagem.',
    topic: 'universo',
    keywords: ['imagem', 'foto', 'retrato', 'desenho', 'referência', 'galeria', 'upload'],
    body: [
      { p: 'Na ficha de um personagem ou lugar, use o cartão **Imagens** para enviar fotos (várias de uma vez). Elas são reduzidas no aparelho antes de subir, para economizar dados.' },
      { p: 'Toque numa imagem para dar legenda, dizer quem aparece nela ou **usar como retrato**. Todas as imagens do universo ficam em Universos → **Imagens**.' },
      { p: 'Formatos: PNG, JPEG e WebP. Envie só imagens que você tem direito de usar.' },
    ],
  },
  {
    slug: 'celular',
    title: 'Usar o Booksmith no celular',
    summary: 'Instalar na tela inicial e escrever em qualquer lugar.',
    topic: 'conta',
    keywords: ['celular', 'android', 'iphone', 'instalar', 'app', 'tela inicial'],
    body: [
      { p: 'O Booksmith funciona no navegador do celular e pode ser instalado como app:' },
      {
        list: [
          '**Android (Chrome):** menu ⋮ → **Adicionar à tela inicial**.',
          '**iPhone (Safari):** botão de compartilhar → **Adicionar à Tela de Início**.',
        ],
      },
      { p: 'Instalado, ele abre em tela cheia e o editor funciona mesmo sem internet.' },
    ],
  },
  {
    slug: 'aparelhos',
    title: 'Sair de um aparelho perdido ou emprestado',
    summary: 'Veja onde sua conta está aberta e desconecte.',
    topic: 'conta',
    keywords: ['aparelho', 'sessão', 'sair', 'desconectar', 'perdi o celular', 'segurança', 'senha'],
    body: [
      { steps: ['Abra Perfil → **Aparelhos conectados**.', 'Toque em **Desconectar** no aparelho, ou em **Desconectar todos os outros aparelhos**.'] },
      { p: 'Vale na hora. Trocar a senha também desconecta todos os aparelhos.' },
    ],
  },
  {
    slug: 'baixar-tudo',
    title: 'Fazer uma cópia de tudo',
    summary: 'Um arquivo .zip com seus livros em Word, universos, imagens e dados da conta.',
    topic: 'conta',
    keywords: ['backup', 'cópia', 'baixar tudo', 'meus dados', 'zip', 'segurança', 'lgpd', 'exportar'],
    body: [
      { steps: ['Abra Perfil → **Baixar tudo**.', 'Toque em **Gerar meu arquivo**.', 'Toque em **Salvar arquivo**.'] },
      { p: 'No arquivo vão cada livro em Word, o texto puro e os dados completos, os universos com personagens, lugares, linha do tempo, relações, mapa e imagens, a sua conta e os pedidos de suporte.' },
      { p: 'Não entram o que está na lixeira e o histórico de versões. Faça uma cópia de vez em quando e guarde num lugar seguro, como o seu Google Drive.' },
    ],
  },
  {
    slug: 'privacidade',
    title: 'Quem pode ver o meu livro',
    summary: 'Seu texto é só seu. Nem o suporte lê sem a sua autorização.',
    topic: 'conta',
    keywords: ['privacidade', 'segurança', 'quem vê', 'lgpd', 'dados', 'suporte lê'],
    body: [
      { p: 'Seus livros são privados. A equipe do Booksmith **não lê o seu texto**: ao falar com o suporte, vai junto só um resumo técnico (a tela onde você estava, o aparelho, os últimos erros), nunca o conteúdo.' },
      { p: 'Se algum dia for preciso ver um capítulo para resolver um problema, a equipe pede autorização a você, por tempo limitado e só para aquele trecho.' },
      { p: 'Pedidos sobre seus dados pessoais (LGPD): fale com o suporte escolhendo o assunto **Privacidade e dados**.' },
    ],
  },
];

/** Busca sem acento e sem diferença de maiúsculas, no título, resumo, palavras-chave e texto. */
export function searchHelp(query: string, articles: HelpArticle[] = HELP_ARTICLES): HelpArticle[] {
  const words = normalize(query).split(/\s+/).filter((w) => w.length > 1);
  if (words.length === 0) {
    return articles;
  }
  return articles
    .map((article) => {
      const head = normalize([article.title, article.summary, ...article.keywords].join(' '));
      const body = normalize(article.body.map(blockText).join(' '));
      let score = 0;
      for (const word of words) {
        if (head.includes(word)) {
          score += 3;
        } else if (body.includes(word)) {
          score += 1;
        } else {
          return { article, score: 0 };
        }
      }
      return { article, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((r) => r.article);
}

/** Divide `**negrito**` em partes, para o template montar sem usar innerHTML. */
export function richParts(text: string): { text: string; bold: boolean }[] {
  return text
    .split(/(\*\*[^*]+\*\*)/)
    .filter(Boolean)
    .map((part) => (part.startsWith('**') ? { text: part.slice(2, -2), bold: true } : { text: part, bold: false }));
}

function blockText(block: HelpBlock): string {
  if ('p' in block) {
    return block.p;
  }
  if ('h' in block) {
    return block.h;
  }
  return ('steps' in block ? block.steps : block.list).join(' ');
}

function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}
