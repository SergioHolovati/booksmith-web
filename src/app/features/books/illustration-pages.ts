/**
 * Livro ilustrado: várias ilustrações de uma vez, uma página para cada. As regras puras (ordem, dupla, nome) ficam
 * aqui; o envio fica na página do livro.
 */

/** Ordem dos nomes como as pessoas contam: "2.png" antes de "10.png". */
export function naturalOrder<T extends { name: string }>(files: readonly T[]): T[] {
  const collator = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' });
  return [...files].sort((a, b) => collator.compare(a.name, b.name));
}

/** O nome da página: o nome do arquivo, sem a extensão (o nome não sai no livro, só ajuda a achar a página). */
export function pageTitle(fileName: string): string {
  const name = fileName.replace(/\.[a-z0-9]{2,5}$/i, '').replace(/[_]+/g, ' ').trim();
  return (name || 'Página').slice(0, 200);
}

/**
 * Imagem deitada na proporção do livro aberto (duas páginas lado a lado) vira página dupla: mais larga que 1,5 vez
 * a proporção de uma página.
 */
export function isSpreadImage(width: number, height: number, trimW: number, trimH: number): boolean {
  if (!width || !height || !trimW || !trimH) {
    return false;
  }
  return width / height > 1.5 * (trimW / trimH);
}

/** Lado maior da ilustração para impressão: 3600 px dá 300 DPI até 30 cm. */
export const PRINT_MAX_DIMENSION = 3600;
/** O limite do servidor é 5 MB por imagem; fica uma folga. */
export const PRINT_MAX_BYTES = 4.8 * 1024 * 1024;

/** Tamanho em bytes do conteúdo de um data URL em base64. */
export function dataUrlBytes(dataUrl: string): number {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  return Math.floor((base64.length * 3) / 4);
}

/**
 * A ilustração em JPEG para impressão (a página inteira não precisa de transparência; o fundo transparente vira
 * branco), o maior possível dentro do limite do servidor: começa em 3600 px e qualidade 0,9 e desce até caber.
 */
export async function compressForPrint(file: File): Promise<{ dataUrl: string; width: number; height: number }> {
  if (!file.type.startsWith('image/')) {
    throw new Error(`"${file.name}" não é uma imagem.`);
  }
  const bitmap = await createImageBitmap(file);
  try {
    const attempts: [number, number][] = [[PRINT_MAX_DIMENSION, 0.9], [PRINT_MAX_DIMENSION, 0.8], [3000, 0.8],
      [2600, 0.78], [2200, 0.75]];
    let last = '';
    for (const [max, quality] of attempts) {
      const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Não foi possível processar a imagem.');
      }
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      last = canvas.toDataURL('image/jpeg', quality);
      if (dataUrlBytes(last) <= PRINT_MAX_BYTES) {
        return { dataUrl: last, width: canvas.width, height: canvas.height };
      }
    }
    return { dataUrl: last, width: bitmap.width, height: bitmap.height };
  } finally {
    bitmap.close();
  }
}
