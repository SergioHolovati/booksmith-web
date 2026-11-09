/**
 * Reduz uma foto antes do upload. Fotos de celular passam fácil de 5 MB (limite da API);
 * redimensionar no aparelho economiza o plano de dados de quem envia.
 */
export async function compressImage(file: File, maxDimension = 1600, quality = 0.85): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Escolha um arquivo de imagem.');
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Não foi possível processar a imagem.');
  }
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  // WebP quando o navegador suporta codificar; senão JPEG (Safari antigo)
  const webp = canvas.toDataURL('image/webp', quality);
  return webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/jpeg', quality);
}
