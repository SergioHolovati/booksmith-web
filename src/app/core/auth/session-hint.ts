const HINT_KEY = 'booksmith.session';
/** Versões antigas guardavam o token de acesso aqui; ele não fica mais salvo no aparelho. */
const LEGACY_KEYS = ['booksmith.access_token', 'access_token'];

/**
 * O token de acesso fica só na memória; a sessão continua pelo cookie HttpOnly (o JavaScript não lê). Aqui fica
 * só um aviso, sem nada secreto, de que vale a pena tentar retomar a sessão ao abrir o app (sem ele, quem nunca
 * entrou não faz uma chamada à toa). localStorage pode falhar (modo privado): aí o app tenta retomar sempre.
 */
export const sessionHint = {
  present(): boolean {
    try {
      return localStorage.getItem(HINT_KEY) === '1';
    } catch {
      return true;
    }
  },

  write(active: boolean): void {
    try {
      if (active) {
        localStorage.setItem(HINT_KEY, '1');
      } else {
        localStorage.removeItem(HINT_KEY);
      }
      LEGACY_KEYS.forEach((key) => localStorage.removeItem(key));
    } catch {
      // sem armazenamento: o app tenta retomar a sessão sempre que abrir
    }
  },
};
