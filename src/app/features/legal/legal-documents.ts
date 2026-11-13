/**
 * Termos de uso (com o termo de responsabilidade do autor) e política de privacidade, como texto estruturado: o
 * template monta títulos, parágrafos e listas sem `innerHTML`. A versão em vigor vem do servidor
 * (`GET /auth/config`); mudou o texto aqui, mude a versão lá (`TERMS_VERSION`): todo mundo aceita de novo.
 *
 * MINUTA: texto de partida para a revisão do advogado. Os trechos entre colchetes são para preencher.
 */
export type LegalDocument = 'terms' | 'privacy';

export interface LegalSection {
  title: string;
  paragraphs: string[];
  items?: string[];
}

export interface LegalText {
  title: string;
  intro: string;
  sections: LegalSection[];
}

export const LEGAL_TEXTS: Record<LegalDocument, LegalText> = {
  terms: {
    title: 'Termos de uso e termo de responsabilidade',
    intro:
      'Estes termos valem para quem cria uma conta no Booksmith. Ao marcar "Li e aceito" no cadastro, você concorda ' +
      'com eles e com a Política de privacidade. Escrevemos em linguagem simples de propósito: o que está aqui é o que vale.',
    sections: [
      {
        title: '1. O que é o Booksmith e quem responde por ele',
        paragraphs: [
          'O Booksmith é um aplicativo para escrever, organizar e preparar livros (originais e fanfics) para publicação, ' +
            'com ferramentas de universo, revisão e exportação.',
          'Ele é oferecido por [razão social da empresa], CNPJ [número], com sede em [cidade/UF], chamada aqui de "nós". ' +
            'Contato: [e-mail de contato].',
        ],
      },
      {
        title: '2. Conta e idade mínima',
        paragraphs: [
          'Para criar uma conta você precisa ter pelo menos 13 anos e informar a data de nascimento verdadeira. ' +
            'Quem tem entre 13 e 17 anos declara que um responsável legal autorizou o uso. Contas com idade falsa podem ser encerradas.',
          'Durante o beta fechado, só cria conta quem recebeu um convite. O convite é pessoal: não o publique.',
          'A conta é sua e não pode ser emprestada nem vendida. Você responde pelo que é feito com ela.',
        ],
      },
      {
        title: '3. Segurança da conta',
        paragraphs: [
          'A verificação em duas etapas é obrigatória. Guarde os códigos de recuperação num lugar seguro: sem eles e sem o ' +
            'celular, a recuperação depende de confirmarmos sua identidade pelo suporte.',
          'Avise o suporte se notar um acesso que não reconhece. Você pode desconectar seus aparelhos a qualquer momento em Perfil.',
        ],
      },
      {
        title: '4. Seu conteúdo é seu',
        paragraphs: [
          'Tudo o que você escreve e envia (textos, personagens, mundos, imagens, capas) continua sendo seu. ' +
            'Não reivindicamos direitos sobre a sua obra.',
          'Para o aplicativo funcionar, você nos autoriza a guardar, processar, fazer cópias de segurança, exibir para você ' +
            'e transformar o seu conteúdo (por exemplo, gerar um PDF ou um ePub) somente para prestar o serviço. ' +
            'Essa autorização acaba quando o conteúdo é apagado.',
          'Nós não lemos o seu texto. A equipe só acessa um trecho com a sua autorização, por tempo limitado, para resolver um problema que você pediu.',
        ],
      },
      {
        title: '5. Termo de responsabilidade do autor',
        paragraphs: ['Ao usar o Booksmith, você declara e se responsabiliza por isto:'],
        items: [
          'O conteúdo que você envia é de sua autoria ou você tem o direito de usá-lo (inclusive imagens e capas).',
          'Fanfics são obras de fã: você sabe que personagens e mundos de outros autores têm donos, não usa o Booksmith para vendê-las ' +
            'e mantém o aviso de obra de fã nas exportações.',
          'Você não envia conteúdo ilegal: material sexual envolvendo menores, incitação à violência ou ao ódio, ameaças, ' +
            'exposição de dados de outras pessoas, plágio ou violação de direitos de terceiros.',
          'O que você publica fora do Booksmith (lojas, gráficas, redes) é responsabilidade sua, inclusive registros, impostos e contratos.',
          'Você não tenta burlar limites, acessar contas de outras pessoas, sobrecarregar o serviço ou copiar o aplicativo.',
        ],
      },
      {
        title: '6. Inteligência artificial',
        paragraphs: [
          'Algumas ferramentas (revisão, ideias, "pergunte ao livro") usam um modelo de inteligência artificial de um fornecedor ' +
            'externo (Anthropic, pela API do Claude). O trecho necessário é enviado só quando você usa a ferramenta, e o fornecedor, ' +
            'pelos termos da API, não usa o texto para treinar modelos. [Advogado: confirmar a redação sobre o fornecedor.]',
          'As sugestões da IA são sugestões: você decide o que entra no livro e responde pelo resultado. Há um limite diário de usos por pessoa.',
        ],
      },
      {
        title: '7. Google: login e backup',
        paragraphs: [
          'Entrar com o Google e o backup no Google Drive são opcionais e seguem também os termos do Google. No backup, o Booksmith ' +
            'só enxerga os arquivos que ele mesmo cria na sua pasta "Booksmith"; o conteúdo da pasta é seu e fica na sua conta Google.',
        ],
      },
      {
        title: '8. Beta: o que esperar',
        paragraphs: [
          'O Booksmith está em teste com um grupo pequeno. Funções podem mudar, aparecer ou sair, e pode haver interrupções. ' +
            'Fazemos cópias de segurança, mas recomendamos que você também exporte o seu livro de vez em quando ("Baixar tudo" e o backup no Drive).',
          'Por enquanto o serviço é gratuito. Se um dia houver planos pagos, avisaremos com antecedência e você escolhe se continua.',
        ],
      },
      {
        title: '9. Suspensão e encerramento',
        paragraphs: [
          'Podemos suspender ou encerrar uma conta que descumpra estes termos, com aviso por e-mail sempre que possível. ' +
            'Você pode encerrar a sua conta quando quiser e levar tudo com "Baixar tudo" antes.',
          'Depois do encerramento, os dados são apagados nos prazos da Política de privacidade.',
        ],
      },
      {
        title: '10. Mudanças nestes termos',
        paragraphs: [
          'Quando o texto mudar, publicamos a nova versão com a data e pedimos o aceite de novo ao entrar. ' +
            'Se não concordar, você pode exportar o seu conteúdo e encerrar a conta.',
        ],
      },
      {
        title: '11. Lei e foro',
        paragraphs: ['Valem as leis do Brasil. Fica eleito o foro de [cidade/UF], salvo o direito do consumidor de usar o foro do seu domicílio.'],
      },
    ],
  },
  privacy: {
    title: 'Política de privacidade',
    intro:
      'Esta política explica quais dados pessoais o Booksmith guarda, para quê, com quem compartilha e quais são os seus direitos, ' +
      'conforme a Lei Geral de Proteção de Dados (LGPD, Lei 13.709/2018).',
    sections: [
      {
        title: '1. Quais dados guardamos',
        paragraphs: ['Só o necessário para o aplicativo funcionar e manter a sua conta segura:'],
        items: [
          'Cadastro: nome, e-mail, data de nascimento (para a idade mínima), nome de usuário e, se você preencher, telefone e perfil de autor.',
          'Conteúdo: os livros, capítulos, universos, imagens e tudo o que você cria no aplicativo.',
          'Segurança e uso: endereço IP, tipo de aparelho e navegador, horários de acesso, registros de login e de ações de segurança ' +
            '(bloqueios, códigos de recuperação, aparelhos novos).',
          'Google (se você ligar): o identificador e o e-mail da sua conta Google; no backup, uma chave para gravar na sua pasta "Booksmith" no Drive.',
          'Convite: qual código de convite criou a sua conta.',
        ],
      },
      {
        title: '2. Para que usamos',
        paragraphs: [
          'Para prestar o serviço (execução do contrato): guardar e exibir o seu conteúdo, exportar, fazer backup, enviar os e-mails da conta.',
          'Para a sua segurança (legítimo interesse e obrigação legal): confirmar o e-mail, bloquear tentativas de invasão, avisar acessos novos, guardar o aceite dos termos.',
          'Para cumprir a lei: idade mínima, guarda de registros de acesso pelo prazo legal (Marco Civil da Internet).',
          'Com o seu pedido (consentimento): enviar trechos do texto à inteligência artificial quando você usa a ferramenta; ligar o Google.',
          'Não usamos seus dados para publicidade e não vendemos dados a ninguém.',
        ],
      },
      {
        title: '3. Com quem compartilhamos',
        paragraphs: ['Com fornecedores que operam o serviço em nosso nome (operadores), apenas no necessário:'],
        items: [
          'Hospedagem: [fornecedor da hospedagem], servidores em [país].',
          'Armazenamento de imagens e cópias de segurança: Cloudflare (R2).',
          'Envio de e-mails: Resend.',
          'Inteligência artificial: Anthropic (API do Claude), só o trecho da ferramenta que você usou.',
          'Google: login e Google Drive, se você ligar.',
          'Autoridades, quando a lei exigir.',
        ],
      },
      {
        title: '4. Por quanto tempo',
        paragraphs: [
          'Enquanto a sua conta existir. Ao encerrar a conta, apagamos os dados em até 30 dias; as cópias de segurança são substituídas em até 30 dias depois disso.',
          'Registros de acesso ficam guardados por 6 meses (Marco Civil) e o registro de aparelhos conhecidos por até 400 dias. ' +
            'O histórico de aceite dos termos fica enquanto a conta existir, como prova do aceite.',
        ],
      },
      {
        title: '5. Seus direitos',
        paragraphs: [
          'Você pode confirmar quais dados temos, acessá-los, corrigi-los, pedir a exclusão, pedir a portabilidade (o "Baixar tudo" já entrega ' +
            'o seu conteúdo em formatos abertos), revogar consentimentos e saber com quem compartilhamos.',
          'Para pedir, use o suporte dentro do aplicativo com o assunto "Privacidade e dados" ou escreva para [e-mail do encarregado]. ' +
            'Respondemos em até 15 dias. Encarregado pelo tratamento de dados (DPO): [nome].',
        ],
      },
      {
        title: '6. Cookies e armazenamento no aparelho',
        paragraphs: [
          'Usamos um único cookie, de sessão, que mantém você conectado e que nenhum script consegue ler. No aparelho, o aplicativo guarda ' +
            'preferências (tema, tamanho da letra) e o rascunho do que você está escrevendo, para o texto não se perder sem internet. ' +
            'Não há cookies de publicidade nem rastreadores de terceiros.',
        ],
      },
      {
        title: '7. Crianças e adolescentes',
        paragraphs: [
          'O Booksmith não é para menores de 13 anos. Dos 13 aos 17, o uso depende da autorização de um responsável, e tratamos esses dados ' +
            'com cuidado redobrado, sem publicidade e sem perfis de comportamento.',
        ],
      },
      {
        title: '8. Como protegemos',
        paragraphs: [
          'Conexão criptografada (HTTPS), senhas guardadas com hash forte, verificação em duas etapas obrigatória, segredos criptografados no banco, ' +
            'cópias de segurança frequentes e fora do servidor, e análise de segurança do código a cada mudança.',
          'Se houver um incidente que afete os seus dados, avisaremos você e a Autoridade Nacional de Proteção de Dados nos prazos da lei.',
        ],
      },
      {
        title: '9. Mudanças nesta política',
        paragraphs: ['Quando mudar, publicamos a nova versão com a data e pedimos o aceite de novo ao entrar.'],
      },
    ],
  },
};
