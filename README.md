# Booksmith Web

App Angular 21 do Booksmith: **mobile-first** e instalável (PWA). O escritor pode escrever o livro inteiro no celular,
inclusive sem sinal. A definição completa está em [`../arquitetura-tecnica.md`](../arquitetura-tecnica.md) (§23).

## Rodar

```bash
npm install
npm start              # http://localhost:4200 (a API em :8090 é acessada pelo proxy em proxy.conf.mjs; no celular, use http://IP-do-PC:4200 na mesma rede Wi-Fi)
npm run start:mobile   # expõe na rede local: abra http://<ip-do-computador>:4200 no celular
```

A API precisa estar rodando (veja `../booksmith/README.md`).

## Testes e build

```bash
npm test -- --watch=false
npm run build          # produção, com service worker
```

## Estrutura

```
src/app
├── core/          # API, autenticação (token + refresh), modelos, utilitários (rascunho offline, imagem, palavras)
├── layout/        # shell: barra superior + navegação inferior (celular) / barra lateral (desktop)
└── features/
    ├── auth/      # login, cadastro, esqueci/redefinir senha, callback do Google
    ├── home/      # "continuar escrevendo"
    ├── books/     # lista, formulário, detalhe com capítulos
    ├── editor/    # editor em tela cheia (TipTap) + esquema do documento + autosave
    └── profile/   # conta e perfil de autor
```

O esquema do editor (`features/editor/schema`) espelha o validador do backend (`ManuscriptDocument.java`):
qualquer nó ou formatação nova precisa ser adicionada nos dois lados.
