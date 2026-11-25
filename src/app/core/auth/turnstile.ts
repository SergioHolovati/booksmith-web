/**
 * Desafio anti-robô da Cloudflare (Turnstile). O script só é baixado quando o login pede o desafio (depois de 3
 * senhas erradas), então quem entra de primeira nunca carrega nada da Cloudflare.
 */
interface TurnstileApi {
  render(element: HTMLElement, options: Record<string, unknown>): string;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
let loading: Promise<TurnstileApi> | null = null;

export function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) {
    return Promise.resolve(window.turnstile);
  }
  loading ??= new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT;
    script.async = true;
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('turnstile')));
    script.onerror = () => {
      loading = null;
      reject(new Error('turnstile'));
    };
    document.head.appendChild(script);
  });
  return loading;
}

/** Mostra o desafio em `element`; `onToken` recebe o token (de uso único) quando ele passa. */
export async function renderTurnstile(
  element: HTMLElement,
  siteKey: string,
  onToken: (token: string | null) => void,
): Promise<{ reset: () => void; remove: () => void }> {
  const api = await loadTurnstile();
  const id = api.render(element, {
    sitekey: siteKey,
    language: 'pt-br',
    callback: (token: string) => onToken(token),
    'expired-callback': () => onToken(null),
    'error-callback': () => onToken(null),
  });
  return { reset: () => api.reset(id), remove: () => api.remove(id) };
}
