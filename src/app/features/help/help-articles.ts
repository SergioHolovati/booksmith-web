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
    slug: 'campos-proprios',
    title: 'Criar seus próprios campos nas fichas',
    summary: 'Signo do personagem, moeda do país, poder da criatura: o que você quiser anotar a mais.',
    topic: 'universo',
    keywords: ['campo', 'campos', 'personalizar', 'ficha', 'signo', 'atributo', 'propriedade', 'extra'],
    body: [
      { steps: [
        'Na ficha de um personagem, lugar ou ficha do mundo, toque em **Criar campos** (no cartão "Seus campos").',
        'Dê um nome ao campo e escolha o tipo de resposta: texto curto, texto longo, escolher uma opção, escolher várias ou uma escala de 1 a 5.',
        'Toque em **Salvar**. O campo aparece em todas as fichas daquele tipo no universo.',
      ] },
      { p: 'Pode renomear um campo ou uma opção depois: o que já foi preenchido continua lá. Tirar um campo, ou mudar o tipo de resposta, esconde o que foi preenchido nele.' },
      { p: 'Os campos são do universo: uma série inteira compartilha os mesmos. Ao juntar dois universos, os campos dos dois ficam.' },
    ],
  },
  {
    slug: 'mencoes',
    title: 'Mencionar personagens e lugares com @',
    summary: 'Ligue o trecho ao personagem e veja depois em quais capítulos ele aparece.',
    topic: 'universo',
    keywords: ['menção', 'mencionar', 'arroba', '@', 'personagem', 'lugar', 'aparece em', 'ligar', 'apelido'],
    body: [
      { steps: ['No editor, digite **@** e o começo do nome.', 'Toque no personagem, lugar ou ficha do mundo na lista.'] },
      { p: 'Também vale o **apelido**: com "Zé" nos apelidos da ficha do José, digite **@Zé**. A lista mostra "Apelido de José", o texto fica com "Zé" e a menção conta para o José.' },
      { p: 'O nome fica destacado no texto. No livro baixado (ePub, PDF ou Word) ele sai como texto normal: o leitor não vê nada diferente.' },
      { p: 'Na ficha do personagem ou lugar, o cartão **Aparece em** mostra os capítulos que o mencionam. Se o personagem mudar de nome, as menções acompanham da próxima vez que você abrir o capítulo.' },
    ],
  },
  {
    slug: 'corretor',
    title: 'Corretor de ortografia e gramática',
    summary: 'Sublinhado vermelho, azul ou tracejado: toque para ver as sugestões.',
    topic: 'texto',
    keywords: ['corretor', 'ortografia', 'gramática', 'erro', 'sublinhado', 'crase', 'concordância', 'dicionário'],
    body: [
      { p: 'Enquanto você escreve, o Booksmith revisa o texto: **vermelho** é ortografia, **azul** é gramática (crase, concordância, regência) e **tracejado** é sugestão de estilo.' },
      { steps: ['Toque na palavra sublinhada.', 'Toque na sugestão certa para trocar, ou em **Ignorar**.'] },
      { p: 'Nomes de personagens, lugares e do seu mundo nunca são marcados. Palavras do glossário do universo (Mundo → Termos) também valem. Inventou outra? Toque nela e em **Adicionar ao dicionário do livro**: ela deixa de ser marcada em todos os capítulos.' },
      { p: 'Personagem que fala errado de propósito? Toque no erro e em **Não revisar este parágrafo**, ou selecione o trecho e toque no olho cortado na barra. O trecho fica com um fundo leve e o corretor deixa ele em paz.' },
      { p: 'O texto é revisado no servidor do Booksmith e não fica guardado lá. Sem internet, o corretor do celular ou do navegador continua funcionando.' },
    ],
  },
  {
    slug: 'notas',
    title: 'Notas ao lado do texto',
    summary: 'Lembretes num trecho do capítulo, que só você vê.',
    topic: 'texto',
    keywords: ['nota', 'notas', 'comentário', 'lembrete', 'anotação', 'revisar depois'],
    body: [
      { steps: ['No editor, selecione o trecho.', 'Toque em **Nota** (o balão) na barra de baixo.', 'Escreva e toque em **Salvar nota**.'] },
      { p: 'O trecho fica com um sublinhado pontilhado. Tocar nele abre a nota. O botão **Notas**, no topo, mostra quantas estão abertas e abre o painel com todas, na ordem do texto.' },
      { p: 'No painel dá para editar, **resolver** (o sublinhado fica mais apagado) ou excluir. As notas só aparecem para você e não saem no livro baixado.' },
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
    summary: 'Arquivos .docx, .odt, .md e .txt: você revisa as divisões antes de criar os capítulos.',
    topic: 'livros',
    keywords: ['importar', 'word', 'docx', 'odt', 'libreoffice', 'markdown', 'txt', 'arquivo', 'pdf', 'sumario', 'subcapitulo', 'introducao', 'apresentacao', 'dedicatoria'],
    body: [
      { steps: ['Abra o livro e toque em **Importar**.', 'Escolha o arquivo.', 'Revise as divisões que encontramos: troque o tipo ou corrija o título onde precisar.', 'Toque em **Aprovar e criar**.'] },
      { p: 'Aceitamos **.docx** (Word, Google Docs), **.odt** (LibreOffice), **.md** e **.txt**. Arquivos .doc antigos e RTF não: abra no Word ou no LibreOffice e salve como .docx.' },
      { p: '**Livro já pronto em PDF?** (diagramado fora daqui, como um livro ilustrado) Escolha o PDF: cada página vira uma página do livro, com a página inteira como imagem de fundo, em 300 DPI. Páginas duplas (as duas do livro aberto numa folha) viram páginas duplas, e o livro fica no tamanho das páginas do PDF. Dá para acrescentar ou cobrir texto por cima, mas não editar o texto do PDF. Até 100 MB.' },
      { p: 'O Booksmith procura sozinho: "Capítulo 3", "Parte 2", "Lição", "Aula", títulos do Word, linhas em negrito ou com letra maior. Cada divisão mostra o motivo e quanto temos certeza. Os tipos: **Capítulo**; **Sem número** (Apresentação, Introdução, Prefácio, Conclusão: entram no sumário sem número); **Subcapítulo** (um título dentro do capítulo, como "1.1 - Natureza divina"); **Parte** (agrupa os capítulos seguintes); **Dedicatória** (vai para as Páginas do livro); **É texto** (não é divisão); **Tirar** (enfeites e subtítulos soltos).' },
      { p: '**O arquivo tem um sumário?** Ele não entra como texto: o Booksmith gera o sumário do livro. Mas você pode usá-lo como estrutura: os capítulos que ainda não têm texto nascem vazios, com os subcapítulos planejados, prontos para escrever.' },
      { p: 'Prefere tudo junto? Toque em **Importar tudo num capítulo só**. Linhas só com ***, ### ou ~~~ viram quebra de cena.' },
    ],
  },
  {
    slug: 'criar-pelo-sumario',
    title: 'Criar os capítulos pelo sumário',
    summary: 'Cole o sumário e o Booksmith cria os capítulos, as partes e os subcapítulos.',
    topic: 'livros',
    keywords: ['sumario', 'indice', 'estrutura', 'capitulos', 'subcapitulo', 'parte', 'plano', 'esqueleto'],
    body: [
      { steps: ['Abra o livro e toque em **Pelo sumário**.', 'Cole ou escreva o sumário, uma linha por capítulo.', 'Toque em **Ver a estrutura** e corrija o tipo ou o título de cada linha.', 'Toque em **Criar**.'] },
      { p: '**Começar de um modelo:** devocional de 30 ou 40 dias, estudo bíblico, livro cristão em partes, autoajuda, didático ou romance em três atos. Um toque preenche o sumário; ajuste à vontade antes de ver a estrutura. Os modelos do gênero do seu livro aparecem primeiro.' },
      { p: '"Parte 1" vira parte; Introdução, Apresentação e Conclusão viram capítulos sem número; "1.1 - …" ou uma linha com espaço no começo vira subcapítulo do capítulo de cima. Números de página no fim da linha são ignorados.' },
      { p: 'Os capítulos nascem vazios, no fim do livro, com os subcapítulos já como títulos dentro de cada um.' },
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
          '**PDF:** para ler ou imprimir, em tamanho de livro (A5). Gerar o PDF é pesado para o servidor, por isso cada pessoa gera até **2 PDFs do livro por dia** (ePub e Word não têm limite).',
          '**Word:** no formato de manuscrito, para revisão. Volta igual se você importar de novo.',
        ],
      },
      { p: 'O arquivo é gerado na hora, com a versão mais recente do texto.' },
    ],
  },
  {
    slug: 'capa',
    title: 'Montar a capa do livro',
    summary: 'Modelo, cores, letra e uma imagem do universo, sem sair do app.',
    topic: 'livros',
    keywords: ['capa', 'cover', 'criar capa', 'imagem', 'título', 'fundo', 'ebook'],
    body: [
      { steps: ['Abra o livro e toque em **Capa**.', 'Escolha o modelo (**Clássica**, **Faixa** ou **Minimalista**), o fundo e, se quiser, uma imagem da biblioteca do universo.', 'Ajuste título, subtítulo, autor, letra e cores.', 'Toque em **Usar como capa**.'] },
      { p: 'A capa sai em 1600 × 2560, o tamanho recomendado para e-book, e vale no app, no ePub e no PDF. O desenho fica guardado: dá para voltar e mudar quando quiser.' },
      { p: 'Para usar uma foto ou um desenho seu como fundo, envie primeiro para a **biblioteca do universo**. Se preferir uma capa pronta, envie a imagem em **Editar** livro.' },
    ],
  },
  {
    slug: 'guia-de-publicacao',
    title: 'Publicar o livro: ISBN, KDP, Clube de Autores e UICLAP',
    summary: 'O caminho do texto pronto até o livro na loja, com o que falta para o destino escolhido.',
    topic: 'livros',
    keywords: ['publicar', 'publicação', 'isbn', 'kdp', 'amazon', 'clube de autores', 'uiclap', 'gráfica', 'ficha catalográfica', 'depósito legal', 'biblioteca nacional', 'palavras-chave', 'vender'],
    body: [
      { steps: ['Na tela do livro, toque em **Publicar**.', 'Escolha para onde o livro vai: Amazon KDP, Clube de Autores, UICLAP ou uma gráfica.', 'Siga a lista: o que tiver o ícone de aviso precisa de ajuste; o resto você marca quando fizer.'] },
      { p: 'O Booksmith confere sozinho o que ele sabe: texto, sinopse, "sobre o autor", tamanho do livro, número de páginas e capa. No KDP, ele avisa se o tamanho não é aceito (o KDP imprime A5 e 6×9 em pé, 8,5×8,5" e 8,25×8,25" quadrados e 8,25×6" deitado), se o livro tem menos de 24 páginas ou se a sinopse passa de 4.000 caracteres.' },
      { p: '**ISBN:** é emitido pela Agência Brasileira do ISBN, da Câmara Brasileira do Livro, com uma taxa por número; o livro impresso e o e-book têm cada um o seu. O KDP oferece um ISBN grátis para o impresso, que só vale na Amazon. Digite o seu no guia: o Booksmith confere se nenhum número ficou trocado e coloca o ISBN nos créditos do livro (o do impresso no PDF, o do e-book no ePub).' },
      { p: '**Ficha catalográfica:** é feita por um bibliotecário, com o ISBN. Cole o texto dela em **Páginas › Créditos**.' },
      { p: '**Depósito legal:** depois de publicar, mande pelo menos 1 exemplar à Biblioteca Nacional em até 30 dias (Lei 10.994/2004). Não tem taxa; o envio é por sua conta.' },
      { p: 'Preços, tamanhos e regras das plataformas mudam: confira no site de cada uma antes de pagar ou enviar. Fanfic não aparece no guia, porque a edição de fã não pode ser vendida.' },
    ],
  },
  {
    slug: 'capa-para-grafica',
    title: 'Capa para gráfica: lombada e contracapa',
    summary: 'A capa aberta nas medidas do KDP ou da sua gráfica, em PDF.',
    topic: 'livros',
    keywords: ['lombada', 'contracapa', 'capa aberta', 'gráfica', 'kdp', 'amazon', 'clube de autores', 'uiclap', 'sangria', 'impressão', 'livro impresso', 'marcas de corte', 'especificação', 'pdf'],
    body: [
      { steps: ['Monte e salve a frente em **Capa**, e escreva o **texto da contracapa** ali mesmo.', 'Toque em **Capa para gráfica**.', 'Escolha onde vai imprimir.', 'Confira as medidas e toque em **Baixar o PDF da capa**.'] },
      { p: 'No **KDP** (Amazon), a lombada é calculada pelo número de páginas do seu PDF e pelo papel (branco, creme ou colorido premium), com 3,2 mm de sangria. O KDP aceita A5 e 6×9 e livros a partir de 24 páginas; a lombada só leva texto a partir de 80 páginas.' },
      { p: 'Em **outra gráfica** (Clube de Autores, UICLAP ou uma gráfica local), cada uma tem a sua conta para a lombada. Digite a medida que ela informar para o seu número de páginas, e a sangria que ela pedir.' },
      { p: '**Capa com orelhas?** Em **Outra gráfica**, informe a largura das orelhas (de 50 a 120 mm). A orelha da frente leva o texto que você escrever (em geral, a sinopse); a de trás, sua foto, o nome e a mini biografia. O KDP não imprime capa com orelhas.' },
      { p: '**Contracapa completa:** o texto (sinopse e depoimentos), uma **imagem de fundo** com escurecimento, a **sua foto** (a das Páginas do livro) com uma **mini biografia** e o **código de barras do ISBN**, gerado a partir do ISBN do impresso que você informou no guia de publicação (o padrão EAN-13 que livrarias e gráficas leem).' },
      { p: 'A prévia mostra o corte (vermelho) e as dobras da lombada (azul). O PDF sai em 300 DPI, em cores de tela; confira no gabarito da gráfica antes de mandar imprimir. Mudou a diagramação? O número de páginas muda, e a lombada junto.' },
      { p: '**Já tem a capa pronta em PDF?** Toque em **Importar capa em PDF**. Se for só a frente (página em pé), ela vira a capa do livro e entra sem perder qualidade, com a lombada e a contracapa daqui. Se for a capa aberta (deitada), conferimos as medidas: se a lombada não bate, dizemos quanto falta ou sobra; se bate, você baixa o seu próprio arquivo, conferido.' },
      { p: 'Antes de importar, abra **Especificações da capa** e diga para qual tamanho de livro ela foi feita (e, se souber, a lombada e a sangria). Pode também **colar a especificação** que o designer mandou e tocar em **Ler a especificação**. Assim o Booksmith acha o corte mesmo com marcas de corte em volta, recorta a frente certinha e entrega à gráfica a capa sem a margem das marcas. Se a capa for de outro tamanho que a diagramação, aparece o botão para diagramar no tamanho dela.' },
      { p: 'Vai encomendar a capa? Toque em **Copiar modelo de especificação**: sai um texto com as medidas certas do seu livro (tamanho, páginas, lombada, sangria, capa aberta e e-book) para mandar a quem for fazer.' },
    ],
  },
  {
    slug: 'diagramacao',
    title: 'Diagramação do PDF: tamanho, letra e margens',
    summary: 'Escolha um modelo, ajuste e veja as páginas de verdade antes de baixar.',
    topic: 'livros',
    keywords: ['diagramação', 'diagramar', 'tamanho', '14x21', 'a5', '16x23', '6x9', 'quadrado', 'deitado', 'paisagem', 'personalizado', 'sangria', 'infantil', 'fonte', 'letra', 'margem', 'entrelinha', 'abertura de capítulo', 'ornamento', 'prévia'],
    body: [
      { steps: ['Abra o livro e toque em **Baixar**.', 'Toque em **Diagramação do PDF**.', 'Escolha um modelo (**Clássico**, **Moderno** ou **Econômico**) e ajuste o que quiser.', 'Toque em **Salvar**. O PDF passa a sair assim.'] },
      { p: 'Dá para escolher o **formato** e o **tamanho**: em pé (A5, 14×21, 16×23 ou 6×9 polegadas, o mais comum na Amazon), quadrado (de 15×15 a 25×25, bom para livro infantil), deitado (21×15, 25×20, 28×21) ou **personalizado**, com a largura e a altura em milímetros. Os marcados com KDP são os que a Amazon imprime.' },
      { p: 'Também a **letra**, o **espaço entre linhas**, as **margens**, a **abertura de capítulo** e o desenho da **quebra de cena**.' },
      { p: '**Vai para a gráfica com imagens até a borda?** Ligue a **sangria**: a página cresce 3,2 mm para fora do corte, a imagem cobre até lá e a gráfica corta sem deixar filete branco. Com sangria, o PDF é o miolo do livro: sai sem a capa (ela vai na capa para gráfica) e com as marcas de corte que a gráfica lê. A Diagramação avisa se há ilustração até a borda e a sangria está desligada.' },
      { p: 'A prévia mostra as páginas reais do PDF; passe com as setas. Mudou a letra ou o tamanho, o número de páginas muda junto.' },
      { p: 'Vale para o PDF. No ePub, quem escolhe a letra é o leitor; o Word sai no formato de manuscrito.' },
    ],
  },
  {
    slug: 'paginas-do-livro',
    title: 'Dedicatória, agradecimentos e outras páginas',
    summary: 'Créditos, dedicatória, epígrafe, agradecimentos e a página sobre você.',
    topic: 'livros',
    keywords: ['dedicatória', 'epígrafe', 'agradecimentos', 'sobre o autor', 'sobre a autora', 'créditos', 'copyright', 'direitos', 'pré-textual'],
    body: [
      { steps: ['Abra o livro e toque em **Páginas** (ou, em **Baixar**, em **Páginas do livro**).', 'Escreva o que quiser; cada linha vira um parágrafo.', 'Toque em **Salvar**.'] },
      { p: 'Antes da história saem a **falsa folha de rosto** (se ligar: uma página só com o título), os **créditos** (no verso da folha de rosto) com a **ficha catalográfica**, a **dedicatória** e a **epígrafe**. Depois do último capítulo, os **agradecimentos**, a página **sobre você** (com a **sua foto**) e o **colofão**, a última página do livro.' },
      { p: '**O livro já vem com todas as páginas em modelo:** créditos, dedicatória, epígrafe, agradecimentos, sobre você e colofão. Complete o que está entre colchetes; enquanto só tiver o modelo, a página não sai no livro. Não quer uma das opcionais? Toque em **Tirar do livro** (e em **Usar o modelo** para trazer de volta).' },
      { p: 'A **ficha catalográfica** é feita por bibliotecária(o) com registro no CRB (muitas gráficas e a Câmara Brasileira do Livro oferecem). Toque em **Usar o modelo** para ver o que ela costuma ter; ela sai em quadro, no fim dos créditos.' },
      { p: 'A página sobre você leva o título que você escolher ("Sobre a autora", "Sobre mim"); em branco, vai o seu nome. O que ficar vazio não aparece no livro.' },
      { p: 'No Word, essas páginas não viram capítulos se você importar o arquivo de novo.' },
    ],
  },
  {
    slug: 'fontes',
    title: 'Fontes do texto',
    summary: 'Escolha a letra do livro; no infantil, cada página pode ter a sua.',
    topic: 'livros',
    keywords: ['fonte', 'letra', 'tipografia', 'infantil', 'escola', 'manuscrita', 'legível', 'garamond', 'diagramação'],
    body: [
      { steps: ['Abra o livro e toque em **Baixar** e depois em **Diagramação do PDF**.', 'Em **Fonte do texto**, toque na fonte (cada uma aparece escrita nela mesma).', 'Toque em **Salvar**.'] },
      { p: 'São 12 fontes livres: 6 de leitura (Literata, Lora, EB Garamond, Merriweather, Atkinson Hyperlegible e Lexend) e 6 infantis (Andika, a letra de escola para quem está aprendendo a ler; Nunito; Fredoka; Baloo 2; Patrick Hand, escrita à mão; e Comic Neue). No livro infantil, as infantis aparecem primeiro.' },
      { p: '**Uma página com outra fonte:** no livro infantil, no desenho da página, escolha a fonte em **Fonte**. "A do livro" volta para a fonte da diagramação.' },
      { p: 'A fonte vai junto no PDF e no ePub (no ePub, o leitor ainda pode trocar). No Word, ela é a fonte do texto; com a Literata, o Word sai em Times New Roman, o formato de manuscrito para editoras.' },
    ],
  },
  {
    slug: 'quadros-de-destaque',
    title: 'Quadros de destaque',
    summary: 'Versículo-chave, Para refletir, Oração, Exercício, Resumo… em quadro no livro.',
    topic: 'livros',
    keywords: ['destaque', 'quadro', 'caixa', 'versículo', 'oração', 'reflexão', 'exercício', 'resumo', 'objetivos', 'devocional', 'didático'],
    body: [
      { steps: ['No editor, deixe o cursor no parágrafo (ou selecione vários).', 'Toque no **marcador** da barra de baixo.', 'Escolha o tipo: Versículo-chave, Para refletir, Oração, Exercício, Resumo, Objetivos, Importante ou Em destaque.'] },
      { p: 'O texto fica num quadro com borda e fundo, com o nome do tipo em cima, no editor e no livro baixado (ePub, PDF e Word). Para trocar o tipo ou **tirar o destaque**, toque no marcador de novo com o cursor dentro do quadro.' },
      { p: 'Bom para devocionais (versículo do dia, oração), estudos bíblicos (perguntas para o grupo), autoajuda (exercícios, resumo do capítulo) e didáticos (objetivos da lição).' },
    ],
  },
  {
    slug: 'notas-de-rodape',
    title: 'Notas de rodapé',
    summary: 'Referências e explicações no pé da página, sem atrapalhar o texto.',
    topic: 'livros',
    keywords: ['nota de rodapé', 'rodapé', 'nota', 'referência', 'citação', 'versículo', 'fonte', 'footnote'],
    body: [
      { steps: ['No editor, deixe o cursor onde a nota deve ser chamada.', 'Toque em **¹** na barra de baixo.', 'Escreva a nota e toque em **Inserir nota**.'] },
      { p: 'No texto aparece só o número, que se ajusta sozinho em cada capítulo. Toque no número para mudar a nota ou **tirar a nota**.' },
      { p: 'No livro baixado, a nota sai no **pé da página** no PDF, abre ao tocar no número no **ePub** e vira nota de rodapé de verdade no **Word**. A nota não conta como palavra do capítulo.' },
      { p: 'Ao importar um arquivo do Word ou do LibreOffice com notas de rodapé, elas vêm junto, no mesmo lugar.' },
    ],
  },
  {
    slug: 'livro-infantil',
    title: 'Livro infantil ilustrado',
    summary: 'Cada página com a ilustração de fundo e o texto por cima, pronto para imprimir.',
    topic: 'livros',
    keywords: ['infantil', 'criança', 'ilustrado', 'picture book', 'página', 'fundo', 'página dupla', 'quadrado', 'imprimir', 'gênero'],
    body: [
      { steps: ['Ao criar o livro, escolha o gênero **Infantil ilustrado**.', 'Na Diagramação, escolha um formato **Quadrado** (ou **Deitado**) e ligue a **sangria**.', 'No livro, toque em **Nova página**.', 'Escreva o texto da página e, em cima, escolha a **ilustração de fundo** e onde fica o texto.'] },
      { p: '**Arraste o texto** na prévia para colocá-lo em qualquer lugar da página (na página dupla, em qualquer uma das duas). A barra **Largura** ajusta a caixa. O PDF sai com o texto exatamente onde você soltou.' },
      { p: 'Cada página tem a ilustração cobrindo tudo, até a borda, e o texto por cima: **em cima**, **no meio**, **embaixo**, **livre** (onde você arrastou) ou **sem texto**. Escolha o tamanho da letra (P, M, G, GG), o alinhamento, a cor (escura ou clara) e, se a imagem atrapalhar a leitura, em **Atrás**: a **faixa** (um fundo atrás do texto), a **névoa** (a ilustração clareia atrás do texto, com a borda esfumada) ou o **desfoque** (a ilustração fica borrada atrás do texto, com a borda esfumada).' },
      { p: '**Mais de um bloco de texto:** no desenho da página, toque em **+ Bloco de texto**. No texto, uma linha "Próximo bloco de texto" separa um bloco do outro: escreva o segundo bloco depois dela. Toque no bloco na prévia (ou no número dele, em **Blocos**) para mudar a letra, a fonte, a cor e o que fica atrás dele, e arraste para pôr onde quiser. **Tirar o bloco** junta o texto dele com o do bloco anterior.' },
      { p: '**Altura da névoa e do desfoque:** com Névoa ou Desfoque, a régua **Altura** estica a área para cima e para baixo do texto (até 4 vezes).' },
      { p: '**De página em página:** no editor da página, **Anterior** e **Próxima** passam para as páginas vizinhas (o que você escreveu é salvo antes); na última, **Nova página** cria a próxima. O "Página 3 de 12" leva para a tela de organizar, e lá **Visualizar prévia** mostra as páginas como vão sair no PDF.' },
      { p: '**Páginas do livro já em modelo:** todo livro novo nasce com os créditos, o "sobre o autor" e o colofão em modelo. Complete o que está **entre colchetes**, como [nome de quem revisou]; a ficha técnica (edição, revisão, ilustração, capa, diagramação) tem campos próprios. Linha que ficar com colchete não sai no livro, e a conferência para a gráfica avisa. Não use colchetes no seu texto: eles contam como campo do modelo. **Ver como fica** mostra a prévia com as páginas.' },
      { p: '**PDF para a gráfica:** com "Folha de rosto, créditos… o Booksmith gera" ligado, o miolo sai como o de uma editora: folha de rosto com a capa, créditos (copyright, ficha técnica, ficha catalográfica e ISBN), página de rosto, dedicatória, agradecimentos, a história, "sobre o autor" (foto e biografia), páginas em branco até fechar em múltiplo de 4 e o colofão. Na Diagramação, escolha o fundo dessas páginas (cor ou ilustração) e se o PDF sai com as **páginas lado a lado** (o livro aberto numa folha, como muitas gráficas pedem). A **conferência para a gráfica** mostra o que falta. Na prévia, escolha **Gráfica** ou **E-book**: o e-book do livro infantil é de layout fixo, com o texto por cima da ilustração.' },
      { p: '**Várias ilustrações de uma vez:** na página do livro, toque em **Importar ilustrações** e escolha todas. Cada uma vira uma página, no fim do livro, na ordem dos nomes dos arquivos (1, 2, 3… 10). Ilustração deitada, do tamanho do livro aberto, vira página dupla. Dá para parar no meio; as que já foram ficam. No desenho da página, **Enviar** também aceita várias de uma vez (elas vão para a biblioteca do universo).' },
      { p: '**Organizar as páginas:** na página do livro, toque em **Organizar páginas vendo as miniaturas**. Toque numa página e use **Antes** e **Depois** para mudar de lugar (no computador, dá para arrastar). A ordem é salva na hora; **Abrir** leva ao desenho da página.' },
      { p: '**Páginas geradas:** a folha de rosto, os créditos, a página de rosto, a dedicatória, os agradecimentos, o "sobre o autor" e o colofão aparecem na organização com a marca **Gerada**. Mude de lugar como as outras; toque numa delas para escolher uma **cor** ou uma **Ilustração** de fundo só dela (**Fundo padrão** volta ao da diagramação). O texto se escreve em **Páginas do livro** (botão **Texto**); a dedicatória e as outras opcionais aparecem aqui quando têm texto.' },
      { p: '**Página nova pela organização:** embaixo das miniaturas, **Com texto** cria uma página da história e **Só ilustração** cria uma página com a ilustração de fundo e sem texto. Ela entra logo depois da página que você tocou (sem nenhuma tocada, depois da última da história). Para tirar uma dedicatória, epígrafe, agradecimentos, "sobre" ou colofão do livro, toque nela e use **Tirar do livro**; para voltar, use o modelo em **Páginas do livro**. Na tela do livro, **Páginas do livro** mostra quantas o livro tem e quantas faltam completar.' },
      { p: '**Página dupla:** a ilustração ocupa as duas páginas do livro aberto. Ela sempre começa numa página da esquerda; se precisar, entra uma página em branco antes. Escolha em que lado fica o texto.' },
      { p: 'A prévia em cima do texto é a página de verdade, no formato do seu livro. Embaixo aparece o **DPI** da ilustração: para imprimir bem, 300. Uma página quadrada de 20×20 cm pede uma imagem de umas 2.400 × 2.400 px.' },
      { p: 'A tela do livro mostra quantas páginas o livro impresso terá. As gráficas imprimem em múltiplos de 4: o Booksmith diz quantas faltam para fechar.' },
    ],
  },
  {
    slug: 'partes',
    title: 'Dividir o livro em partes',
    summary: '"Parte I — A partida": agrupe capítulos, com página própria no livro.',
    topic: 'livros',
    keywords: ['parte', 'partes', 'divisão', 'seção', 'livro um', 'agrupar capítulos'],
    body: [
      { steps: ['Abra o livro.', 'No capítulo que começa a parte, toque no marcador (**Começar parte aqui**).', 'Dê o nome, como "Parte I — A partida", e toque em **Salvar**.'] },
      { p: 'A parte vai até a próxima. Toque no nome dela para renomear ou **tirar a parte**. Mover o capítulo leva o começo da parte junto.' },
      { p: 'Para mudar o nome de um capítulo sem abrir, toque no lápis ao lado dele na lista do livro.' },
      { p: 'No livro baixado, cada parte ganha uma página de abertura e aparece no sumário. No Word, volta igual se você importar o arquivo de novo.' },
    ],
  },
  {
    slug: 'ilustracoes',
    title: 'Ilustrações no meio do texto',
    summary: 'Coloque um desenho ou mapa no capítulo, com legenda.',
    topic: 'livros',
    keywords: ['ilustração', 'imagem no texto', 'desenho', 'mapa', 'figura', 'legenda', 'dpi', 'resolução', 'borrada', 'impressão'],
    body: [
      { steps: ['No editor, deixe o cursor onde a imagem deve ficar.', 'Toque em **Inserir ilustração** (a moldura) na barra de baixo.', 'Escolha uma imagem da biblioteca do universo ou envie uma nova.'] },
      { p: 'Toque na ilustração para mudar a legenda ou **tirar do texto**.' },
      { p: 'Embaixo dela, escolha o **lugar na página**: pequena, média ou na largura do texto (a pequena e a média podem ficar à esquerda ou à direita, com o texto em volta), **página só dela**, **página inteira, até a borda** (sem margem, cobrindo a página) ou **página dupla** (as duas páginas do livro aberto, no PDF impresso). Até a borda, a legenda não aparece.' },
      { p: 'Ali mesmo aparece o **DPI** que ela terá impressa, com as medidas do seu livro. Página inteira e dupla pedem imagens grandes: para um A5 até a borda, uma imagem em pé com uns 1.750 × 2.480 px; a dupla, deitada, com uns 3.500 × 2.480 px.' },
      { p: 'No livro baixado, ela sai no ePub, no PDF e no Word, com a legenda.' },
      { p: '**Página só de ilustração, fora dos capítulos:** na tela do livro, toque em **Organizar páginas e ilustrações**. Ali aparecem todas as páginas do livro como saem no PDF (capa, folha de rosto, créditos, sumário, cada capítulo com as páginas dele e as do fim). Toque num trecho e em **Página de ilustração**: ela entra logo depois (no começo do livro, antes do primeiro capítulo, entre dois capítulos ou no fim). Toque nela para mudar de lugar (**Antes**/**Depois**), deixar **Até a borda**, **Trocar** a imagem ou **Tirar**. Ela sai no PDF e no ePub; no Word não, porque o Word é o arquivo para editar e importar de novo. Os capítulos também mudam de lugar ali, com todas as páginas deles juntas.' },
      { p: 'Vai imprimir? Gráficas pedem imagens com 300 DPI no tamanho em que saem na página. A **Diagramação** e o **guia de publicação** avisam qual ilustração pode sair borrada e com quantos pixels de largura ela ficaria boa. Imagens em WebP não entram no PDF: use JPEG ou PNG.' },
    ],
  },
  {
    slug: 'universos',
    title: 'Universos, séries e personagens compartilhados',
    summary: 'Vários livros no mesmo mundo, com os mesmos personagens, lugares e linha do tempo.',
    topic: 'universo',
    keywords: ['universo', 'série', 'saga', 'continuação', 'mundo', 'compartilhar', 'juntar', 'excluir', 'apagar'],
    body: [
      { p: 'Todo livro vive num universo. Para uma série, crie os livros seguintes **no mesmo universo**: em Universos, toque em **Novo livro neste universo**. Personagens, lugares, linha do tempo, mapa e imagens ficam disponíveis para todos.' },
      { p: 'Já tem um livro em outro universo? Abra o livro, toque em **Editar** e escolha o universo da série. Os personagens, lugares e a linha do tempo dele vão junto, e o Booksmith avisa se houver nomes repetidos.' },
      { p: '**Excluir um universo:** em Universos, toque em **Excluir** no cartão dele. Se houver livros vinculados, o Booksmith avisa quais são: eles vão **juntos para a lixeira** (30 dias). Restaurar um desses livros na lixeira traz o universo de volta, com tudo o que havia nele.' },
    ],
  },
  {
    slug: 'ideias-da-ia',
    title: 'Ideias da IA: ajuda sem escrever por você',
    summary: 'Sugestões e perguntas para o universo, os personagens e o enredo. Quem decide e escreve é você.',
    topic: 'universo',
    keywords: ['ia', 'inteligência artificial', 'ideia', 'sugestão', 'bloqueio', 'enredo', 'trama', 'reviravolta', 'pergunta', 'inspiração'],
    body: [
      { p: 'A IA do Booksmith **não escreve a história**. Ela oferece possibilidades curtas ou faz perguntas, e você escolhe o que usar e escreve do seu jeito.' },
      {
        list: [
          '**Universo e personagens:** embaixo de cada campo de texto longo (perigos, costumes, medos, segredos…), toque em **Ideias da IA**.',
          '**Enredo:** na página do livro, abra **Ideias para o enredo** e escolha o assunto: o que pode vir depois, conflitos, reviravoltas, tramas paralelas ou caminhos para o final.',
        ],
      },
      { p: 'Escolha **Ideias** (4 possibilidades) ou **Perguntas para mim** (4 perguntas para você pensar). Se quiser, peça algo específico, como "algo ligado ao mar".' },
      { p: '**Usar no campo** acrescenta a ideia no fim do campo, num parágrafo novo, para você reescrever. Nada é salvo sozinho: só quando você toca em **Salvar**. No enredo, a ideia só pode ser copiada; nada entra no texto do livro.' },
      { p: 'A IA lê o que está na tela e o resumo do seu universo (e, no enredo, a sinopse e o fim do último capítulo). A IA é o Claude, da Anthropic: o trecho usado no pedido é enviado a ela, que não o usa para treinar modelos. Cada pedido usa 1 dos seus 3 usos de IA a cada 24 horas (revisões, ideias e perguntas somam juntos), e o rodapé do painel mostra quantos restam.' },
    ],
  },
  {
    slug: 'revisar-textos-do-livro',
    title: 'Revisar a sinopse, o "sobre o autor" e as fichas',
    summary: 'Ortografia, formatação e nomes ou fatos que divergem da história.',
    topic: 'texto',
    keywords: ['sinopse', 'sobre o autor', 'biografia', 'ficha', 'nome', 'acento', 'divergência', 'revisão', 'ortografia'],
    body: [
      { p: 'Na página do livro, abra **Revisar textos do livro**. Ele olha a sinopse, o "Sobre o autor" e as fichas dos personagens e compara com o que está escrito nos capítulos.' },
      {
        list: [
          '**Revisar sem IA** (livre): ortografia, formatação (espaço duplo, vírgula grudada) e nomes escritos de outro jeito, como "Sergio" na sinopse e "Sérgio" na história.',
          '**Comparar com IA** (1 dos seus 3 usos a cada 24 horas): fatos que divergem, como a sinopse dizer 6 meses e a história dizer 5.',
        ],
      },
      { p: 'Os apontamentos aparecem separados por texto. Para corrigir, marque as caixinhas (ou **Marcar todos**) e toque em **Corrigir marcados**, ou use **Corrigir** em um só. Nomes e formatação já vêm marcados. Um nome trocado vale para o texto inteiro: "Sergio" vira "Sérgio" em toda a sinopse. Se você já tinha mudado aquele ponto, a correção é pulada.' },
      { p: 'Os fatos que a IA aponta não se corrigem sozinhos: toque em **Editar** para ir à sinopse, às páginas do livro ou à ficha do personagem e decidir.' },
    ],
  },
  {
    slug: 'pergunte-ao-livro',
    title: 'Pergunte ao seu livro',
    summary: 'Pergunte sobre a sua história e veja a resposta com os trechos de onde ela veio.',
    topic: 'texto',
    keywords: ['pergunta', 'perguntar', 'pergunte', 'resposta', 'trecho', 'capítulo', 'lembrar', 'continuidade', 'ia'],
    body: [
      { p: 'Na página do livro, abra **Pergunte ao seu livro** e escreva o que quer saber: "Quem já sabe do segredo?", "Quantos anos o Ben tem?", "Onde a Lia estava no capítulo 3?".' },
      { p: 'A IA lê o texto e as fichas do universo e responde em poucas frases. Embaixo vêm os **trechos de origem**: toque num deles para abrir o editor naquele parágrafo.' },
      { p: 'Se o livro não responde, ela diz que não encontrou, em vez de inventar. Se o texto e as fichas discordam (a ficha diz 5 meses e a sinopse diz 6, por exemplo), ela avisa.' },
      { p: 'As perguntas ficam só na tela; nada é guardado. Cada pergunta usa 1 dos seus 3 usos de IA a cada 24 horas. O texto vai para a Anthropic (Claude), que não o usa para treinar modelos.' },
    ],
  },
  {
    slug: 'revisao-da-ia',
    title: 'Revisão do capítulo',
    summary: 'Formatação, ortografia, frases, furos de roteiro, continuidade e melhorias no enredo. A IA aponta; você decide.',
    topic: 'texto',
    keywords: ['revisão', 'revisar', 'ortografia', 'gramática', 'erro', 'furo', 'roteiro', 'continuidade', 'enredo', 'melhorar', 'ia', 'formatação', 'travessão', 'aspas', 'frase', 'estilo'],
    body: [
      { p: 'No editor, toque em **Revisão do capítulo** (o quadradinho com o visto, no alto). São duas ações separadas: **Revisar sem IA** (formatação e ortografia pelo corretor do Booksmith, sem limite) e, como bônus, **Revisão com IA**, que faz cinco revisões de uma vez e usa 1 dos seus 3 usos de IA a cada 24 horas. Os apontamentos aparecem separados por tipo:' },
      {
        list: [
          '**Formatação** (sem IA, livre): falas com aspas onde o livro usa travessão, fala começando com minúscula, "dona Lurdes" num lugar e "Dona Lurdes" em outro, "perguntou Ana" repetido.',
          '**Ortografia** (sem IA, livre): o corretor do Booksmith, o mesmo que sublinha no editor. Os nomes do seu universo e as palavras do dicionário do livro não contam como erro.',
          '**Ortografia e gramática (revisão da IA):** o que o corretor deixa passar, como concordância e a vírgula antes de "respondeu".',
          '**Frases e estilo:** redundância, ordem estranha das palavras, palavra que sobra. A sua voz e a fala dos personagens ficam como estão.',
          '**Furos de roteiro:** o que não se sustenta, comparando com os capítulos anteriores, as notas e as fichas.',
          '**Continuidade:** o que contradiz as fichas (olhos, idade, lugares, regras do mundo) ou o que já foi contado.',
          '**Melhorias no enredo:** ritmo, tensão, ganchos e conflitos que poderiam render mais.',
        ],
      },
      { p: 'Toque no trecho destacado para ir até ele no texto. Quando há **Corrigir** (formatação, ortografia, frases), ele troca só aquele trecho, e dá para desfazer. Para corrigir vários de uma vez, marque as caixinhas (ou **Marcar todos**) e toque em **Corrigir marcados**. Na formatação, tudo já vem marcado: um capítulo inteiro com aspas vira travessão em um toque. Nos outros, a IA só aponta; quem muda o texto é você. **Dispensar** tira o apontamento da lista.' },
      { p: 'Os apontamentos aparecem conforme cada revisão termina, e você vê o andamento. **Parar** interrompe o resto. A revisão com IA completa conta como 1 uso, por maior que seja o capítulo. Quando os 3 usos acabam, só as ações de IA ficam bloqueadas; a formatação continua. O que estiver por salvar é salvo antes. A IA erra às vezes, principalmente em continuidade e furos: confira antes de mudar.' },
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
    slug: 'seguranca-da-conta',
    title: 'Entrar com segurança',
    summary: 'Confirmar o e-mail, senha errada, avisos por e-mail e o login com Google.',
    topic: 'conta',
    keywords: ['entrar', 'login', 'código', 'confirmar e-mail', 'bloqueado', 'senha errada', 'google', 'segurança', 'novo acesso', 'data de nascimento', 'ligar google', 'vincular'],
    body: [
      { p: '**Confirmar o e-mail:** depois de criar a conta, digite o código de 6 caracteres que chegou por e-mail. Sem isso, o login não entra. Não chegou? Confira o spam e toque em **Enviar outro código** (dá para pedir um por minuto).' },
      { p: '**Senha errada:** depois de 5 tentativas erradas seguidas, o login da conta fica bloqueado por 15 minutos, e o dono recebe um e-mail. Esqueceu a senha? Use **Esqueceu a senha?** na tela de entrar.' },
      { p: '**Avisos por e-mail:** quando sua conta é acessada de um aparelho que ela nunca usou, ou quando é ligada ao Google, você recebe um e-mail. Se não foi você, troque a senha e desconecte os aparelhos que não reconhece em Perfil → **Aparelhos conectados**.' },
      { p: '**Entrar com Google:** na primeira vez, o Booksmith pede sua data de nascimento (para proteger contas de menores de idade) e confirma o seu nome de usuário.' },
      { p: '**Criou a conta com e-mail e senha?** Entre com a senha e, em Perfil → **Entrar com Google**, toque em **Ligar ao Google**. Vale até uma conta Google de outro e-mail. Como isso cria outro jeito de entrar na sua conta, o Booksmith pede antes um código da verificação em duas etapas. Depois, dá para entrar pelos dois jeitos, e desligar quando quiser.' },
      { p: '**Criou a conta pelo Google e quer uma senha também?** Em Perfil → **Entrar com Google**, toque em **Criar senha**: mandamos um link para o seu e-mail. Com senha, dá para desligar o Google quando quiser.' },
    ],
  },
  {
    slug: 'convite-beta',
    title: 'Convite para o beta',
    summary: 'O Booksmith está em beta fechado: para criar conta, use o código que você recebeu.',
    topic: 'conta',
    keywords: ['convite', 'beta', 'código', 'criar conta', 'cadastro', 'beta fechado'],
    body: [
      { p: 'Por enquanto, o Booksmith está em **beta fechado**: só cria conta quem recebeu um convite. Abra o link do convite (o código já vem preenchido) ou digite o código em **Criar conta**.' },
      { p: 'Dá para criar a conta com e-mail e senha ou tocando em **Criar conta com Google**, na mesma tela. O código pode ser digitado em minúsculas e sem os hífens.' },
      { p: 'Já tem conta? Entre normalmente: o convite só é pedido para criar a conta.' },
    ],
  },
  {
    slug: 'verificacao-em-duas-etapas',
    title: 'Verificação em duas etapas',
    summary: 'Além da senha, um código do celular ou do e-mail para entrar.',
    topic: 'conta',
    keywords: ['verificação em duas etapas', 'dois fatores', '2fa', 'mfa', 'autenticador', 'google authenticator', 'código', 'recuperação', 'segurança', 'obrigatória', 'proteja sua conta'],
    body: [
      { p: 'No Booksmith ela é **obrigatória**: quem descobrir sua senha ainda não entra, porque depois da senha (ou do Google) o Booksmith pede um código. No primeiro acesso, a tela **Proteja sua conta** aparece antes de tudo.' },
      { steps: ['Na tela **Proteja sua conta** (ou, depois, em Perfil → **Verificação em duas etapas**), escolha o método.', 'Toque em **Usar app autenticador** e leia o QR code com o Google Authenticator, o Microsoft Authenticator ou o 1Password (no celular, toque em **Abrir no app autenticador**). Ou escolha **Usar código por e-mail**.', 'Digite o código que aparece e toque em **Ativar**.', 'Guarde os **10 códigos de recuperação** (copie ou baixe o .txt) num lugar seguro, fora do celular.'] },
      { p: '**Perdeu o celular?** Na tela do código, toque em **Usar um código de recuperação**. Cada um vale uma vez; em Perfil dá para gerar novos.' },
      { p: 'Não dá para desligar. Para trocar de método, adicione o outro em Perfil (dá para ter os dois). Você recebe um e-mail sempre que um método é ativado ou um código de recuperação é usado.' },
      { p: '**Sua sessão fica protegida:** o Booksmith não guarda mais a chave da sessão no aparelho; ela fica num cookie que nenhum script consegue ler. Fechar e abrir o app continua sem pedir a senha de novo.' },
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
    slug: 'backup-google-drive',
    title: 'Backup no Google Drive',
    summary: 'Uma cópia de cada livro no seu Drive, todo dia, sem você lembrar.',
    topic: 'conta',
    keywords: ['backup', 'google drive', 'drive', 'cópia', 'nuvem', 'segurança', 'word'],
    body: [
      { steps: ['Abra Perfil → **Backup no Google Drive**.', 'Toque em **Ligar o Google Drive** e autorize na tela do Google.', 'De volta ao Booksmith, toque em **Fazer backup agora** para a primeira cópia.'] },
      { p: 'Cada livro vai como arquivo Word na pasta **Booksmith** do seu Drive, e é atualizado toda madrugada. O Drive guarda as versões anteriores de cada arquivo. Para voltar um livro ao Booksmith, use **Importar** com o arquivo do Drive.' },
      { p: 'O Booksmith só vê os arquivos que ele mesmo cria no seu Drive, nunca o resto. Para parar, toque em **Desligar**: os arquivos que já estão no Drive continuam com você.' },
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
    slug: 'ilustracoes-com-ia',
    title: 'Ilustrações com IA (retratos e cenas)',
    summary: 'Gere o retrato de um personagem ou a ilustração de uma cena, no estilo que você escolher.',
    topic: 'universo',
    keywords: ['ilustração', 'ia', 'retrato', 'imagem', 'gerar', 'estúdio visual', 'desenho', 'estilo', 'aquarela', 'cena'],
    body: [
      { p: '**Retrato:** na ficha do personagem, toque em **Gerar retrato com IA**. O desenho parte da aparência que você preencheu na ficha (salve antes). Escolha o estilo de arte, colorido ou preto e branco, a paleta, o enquadramento e a expressão. Se ele já tem retrato, o novo fica parecido com o atual.' },
      { p: '**Cena:** no capítulo, toque em **Inserir ilustração** e depois em **Gerar com IA**. Descreva a cena, marque quem aparece (até 4; o retrato de cada um mantém o rosto), o lugar (a ficha dele entra na descrição), a luz, o clima, o enquadramento e o formato: página inteira, abertura de capítulo ou vinheta. A imagem entra direto no texto.' },
      { p: '**Capa:** quando o livro estiver marcado como **Concluído**, o editor de capa ganha **Gerar arte da capa com IA**. Diga o que a capa mostra e o clima; a arte sai sem letras e vira o fundo, e o título e o autor entram por cima, como já era. Depois é só salvar a capa.' },
      { p: '**Para acertar mais:** preencha a aparência na ficha (é ela que descreve o personagem para o gerador), gere primeiro o retrato de cada personagem e só depois as cenas (os retratos viram referência), e escreva a cena como uma frase concreta: quem faz o quê, onde, com que luz.' },
      { p: 'O estilo que você usar fica guardado para o universo, para todas as ilustrações saírem coerentes. **Preto e branco** é a melhor escolha para o miolo de um livro impresso: imprimir em cores encarece muito o exemplar.' },
      { p: 'Por enquanto, cada pessoa gera **3 ilustrações por semana**. Pedidos recusados pelo gerador (personagens de outras obras, violência explícita, nudez) não contam. Toda imagem gerada fica na biblioteca do universo com a marca **IA**; ao publicar, declare que usou IA (a Amazon pede isso).' },
    ],
  },
  {
    slug: 'termos-e-privacidade',
    title: 'Termos de uso e política de privacidade',
    summary: 'O que você aceita ao criar a conta, e o que acontece quando o texto muda.',
    topic: 'conta',
    keywords: ['termos', 'termos de uso', 'termo de responsabilidade', 'privacidade', 'lgpd', 'aceite', 'aceitar', 'política'],
    body: [
      { p: 'Ao criar a conta (por e-mail ou pelo Google), você aceita os **Termos de uso**, o **Termo de responsabilidade** do autor e a **Política de privacidade**. Eles ficam sempre abertos em /termos e /privacidade, sem precisar entrar.' },
      { p: 'Guardamos a versão que você aceitou e a data. Quando o texto mudar, o Booksmith mostra a nova versão ao entrar e pede o aceite de novo antes de abrir o app. Se não concordar, dá para exportar tudo em **Baixar tudo** e encerrar a conta.' },
      { p: 'Em resumo: seu texto é seu; você responde pelo que envia e publica; fanfic é obra de fã, sem venda; a IA só vê o trecho que você mandou revisar.' },
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
