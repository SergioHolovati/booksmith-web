export const environment = {
  production: false,
  /** Relativo: o dev server faz proxy para a API (proxy.conf.json), o que também funciona no celular pela rede local. */
  apiBaseUrl: '/api/v1',
  /** O login com Google precisa ir direto à API, cujo endereço está cadastrado no Google. */
  authBaseUrl: 'http://localhost:8090',
};
