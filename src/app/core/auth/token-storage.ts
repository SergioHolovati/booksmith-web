const KEY = 'booksmith.access_token';
const LEGACY_KEY = 'access_token';

/** localStorage pode falhar (modo privado, armazenamento bloqueado): o app continua funcionando em memória. */
export const tokenStorage = {
  read(): string | null {
    try {
      const token = localStorage.getItem(KEY) ?? localStorage.getItem(LEGACY_KEY);
      // Versões antigas guardavam "Bearer <token>"
      return token?.replace(/^Bearer\s+/i, '') || null;
    } catch {
      return null;
    }
  },

  write(token: string | null): void {
    try {
      if (token) {
        localStorage.setItem(KEY, token);
      } else {
        localStorage.removeItem(KEY);
      }
      localStorage.removeItem(LEGACY_KEY);
    } catch {
      // sem persistência: a sessão vale só enquanto a aba estiver aberta
    }
  },
};
