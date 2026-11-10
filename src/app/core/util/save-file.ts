/** Arquivo gerado pela API e já baixado pelo app. */
export interface DownloadedFile {
  filename: string;
  blob: Blob;
}

/** Salva o arquivo no aparelho. Chame a partir de um toque: o Safari do iPhone exige o gesto da pessoa. */
export function saveFile(file: DownloadedFile): void {
  const url = URL.createObjectURL(file.blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** "389614" → "381 KB"; "5242880" → "5,0 MB". */
export function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  return `${(bytes / (1024 * 1024)).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} MB`;
}
