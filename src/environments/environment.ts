export const environment = {
  production: true,
  /** Mesmo domínio em produção (CloudFront roteia /api para a API). */
  apiBaseUrl: '/api/v1',
  /** Base do fluxo OAuth2 (/oauth2/authorization/google). */
  authBaseUrl: '',
  /** O backoffice da equipe (outro endereço, sessão própria). */
  adminUrl: 'https://adminbooksmith.com.br',
};
