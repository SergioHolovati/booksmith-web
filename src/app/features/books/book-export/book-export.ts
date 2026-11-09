import { Component, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { firstValueFrom } from 'rxjs';

import { ExportApi, ExportFormat, ExportedFile } from '../../../core/api/export.api';
import { ManuscriptApi } from '../../../core/api/manuscript.api';
import { problemMessage } from '../../../core/api/problem';
import { BookDetail } from '../../../core/models/api.models';

interface FormatOption {
  format: ExportFormat;
  title: string;
  icon: string;
  description: string;
}

const FORMATS: FormatOption[] = [
  {
    format: 'epub',
    title: 'ePub',
    icon: 'pi pi-book',
    description: 'Para leitores digitais (Kindle, Kobo, Apple Books, Google Play Livros). O texto se ajusta à tela.',
  },
  {
    format: 'pdf',
    title: 'PDF de leitura',
    icon: 'pi pi-file-pdf',
    description: 'Páginas de livro (A5), com sumário. Bom para mandar a leitores beta ou imprimir em casa.',
  },
  {
    format: 'docx',
    title: 'Word',
    icon: 'pi pi-file-word',
    description:
      'Manuscrito para editoras, concursos e revisores: Times 12, espaço 1,5, um capítulo por página. Abre no Word e no Google Docs.',
  },
];

/** Tamanho legível: "84 KB", "1,2 MB". */
export function fileSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  return `${(bytes / (1024 * 1024)).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`;
}

/**
 * Baixar o livro: gera o arquivo na hora e oferece salvar no aparelho ou, no celular, enviar direto para
 * outro app (Kindle, Drive, WhatsApp). O envio precisa do arquivo pronto antes do toque, por isso são dois passos.
 */
@Component({
  selector: 'app-book-export',
  imports: [RouterLink, ButtonModule, MessageModule, ProgressSpinnerModule],
  templateUrl: './book-export.html',
  styleUrl: './book-export.scss',
})
export class BookExportComponent {
  private readonly api = inject(ManuscriptApi);
  private readonly exportApi = inject(ExportApi);

  readonly bookId = input.required<string>();

  readonly formats = FORMATS;
  readonly fileSize = fileSize;
  readonly book = signal<BookDetail | null>(null);
  readonly loadError = signal<string | null>(null);
  readonly generating = signal<ExportFormat | null>(null);
  readonly ready = signal<Partial<Record<ExportFormat, ExportedFile>>>({});
  readonly errors = signal<Partial<Record<ExportFormat, string>>>({});

  constructor() {
    queueMicrotask(() => void this.loadBook());
  }

  private async loadBook(): Promise<void> {
    try {
      this.book.set(await firstValueFrom(this.api.getBook(this.bookId())));
    } catch (error) {
      this.loadError.set(problemMessage(error, 'Não foi possível abrir o livro.'));
    }
  }

  async generate(format: ExportFormat): Promise<void> {
    this.generating.set(format);
    this.errors.update((errors) => ({ ...errors, [format]: undefined }));
    try {
      const file = await firstValueFrom(this.exportApi.download(this.bookId(), format));
      this.ready.update((ready) => ({ ...ready, [format]: file }));
    } catch (error) {
      this.errors.update((errors) => ({
        ...errors,
        [format]: problemMessage(error, 'Não foi possível gerar o arquivo. Tente novamente.'),
      }));
    } finally {
      this.generating.set(null);
    }
  }

  save(file: ExportedFile): void {
    const url = URL.createObjectURL(file.blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  canShare(file: ExportedFile): boolean {
    return typeof navigator.canShare === 'function' && navigator.canShare({ files: [asFile(file)] });
  }

  async share(file: ExportedFile): Promise<void> {
    try {
      await navigator.share({ files: [asFile(file)], title: this.book()?.title });
    } catch {
      // cancelado pela pessoa: nada a fazer
    }
  }
}

function asFile(file: ExportedFile): File {
  return new File([file.blob], file.filename, { type: file.blob.type });
}
