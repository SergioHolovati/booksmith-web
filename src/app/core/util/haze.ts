/**
 * A névoa atrás do texto do livro ilustrado, igual à do PDF (Haze.java no servidor): o centro, onde fica o texto,
 * cheio; a borda esfumada até sumir. Desenhada uma vez num canvas e usada como fundo esticado da caixa do texto.
 */
const CORE_X = 0.62;
const CORE_Y = 0.42;

/** Transparência de 0 a 1 no ponto (u, v) da caixa (a mesma conta do servidor). */
export function hazeAlpha(u: number, v: number, max: number): number {
  const ex = Math.max(0, (Math.abs(2 * u - 1) - CORE_X) / (1 - CORE_X));
  const ey = Math.max(0, (Math.abs(2 * v - 1) - CORE_Y) / (1 - CORE_Y));
  const d = Math.min(1, Math.sqrt(ex * ex + ey * ey));
  return max * (1 - d * d * (3 - 2 * d));
}

const cache = new Map<string, string>();

/** O fundo da caixa: névoa clara (atrás do texto escuro) ou escura (atrás do texto claro). */
export function hazeBackground(light: boolean, doc: Document = document): string {
  const key = light ? 'light' : 'dark';
  const cached = cache.get(key);
  if (cached) {
    return cached;
  }
  const [rgb, max] = light ? [255, 0.86] : [0, 0.62];
  const canvas = doc.createElement('canvas');
  canvas.width = 240;
  canvas.height = 120;
  const context = canvas.getContext?.('2d');
  let value: string;
  if (context) {
    const image = context.createImageData(canvas.width, canvas.height);
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const i = (y * canvas.width + x) * 4;
        image.data[i] = image.data[i + 1] = image.data[i + 2] = rgb;
        image.data[i + 3] = Math.round(255 * hazeAlpha((x + 0.5) / canvas.width, (y + 0.5) / canvas.height, max));
      }
    }
    context.putImageData(image, 0, 0);
    value = `url(${canvas.toDataURL('image/png')})`;
  } else {
    // Sem canvas (testes): uma aproximação com gradiente
    value = `radial-gradient(closest-side, rgba(${rgb}, ${rgb}, ${rgb}, ${max}) 60%, rgba(${rgb}, ${rgb}, ${rgb}, 0))`;
  }
  cache.set(key, value);
  return value;
}
