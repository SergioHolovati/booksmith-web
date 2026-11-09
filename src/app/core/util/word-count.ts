/** Mesma regra do backend (ManuscriptDocument.countWords): "saiu-se" e "d'água" contam como uma palavra. */
const WORD = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu;

export function countWords(text: string): number {
  return text.match(WORD)?.length ?? 0;
}

export function formatCount(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(value);
}
