import { HttpClient, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, from, map, switchMap, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { BookLayout, LayoutPreview } from '../models/api.models';

export type ExportFormat = 'epub' | 'pdf' | 'docx';

export interface ExportedFile {
  filename: string;
  blob: Blob;
}

/** Baixar o livro em ePub, PDF de leitura ou Word. O arquivo é gerado na hora pela API. */
@Injectable({ providedIn: 'root' })
export class ExportApi {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  /** Páginas do PDF com a diagramação dada (salva ou não), como imagens; até 4 por pedido. */
  preview(bookId: string, layout: BookLayout, from: number, count = 2): Observable<LayoutPreview> {
    return this.http.post<LayoutPreview>(`${this.base}/books/${bookId}/export/preview`, { ...layout, from, count });
  }

  download(bookId: string, format: ExportFormat): Observable<ExportedFile> {
    return this.file(`${this.base}/books/${bookId}/export/${format}`, `livro.${format}`);
  }

  /** "Baixar tudo": um .zip com livros (Word, texto e dados), universos com imagens, conta e pedidos de suporte. */
  downloadEverything(): Observable<ExportedFile> {
    return this.file(`${this.base}/me/export`, 'booksmith.zip');
  }

  private file(url: string, fallbackName: string): Observable<ExportedFile> {
    return this.http.get(url, { observe: 'response', responseType: 'blob' }).pipe(
      map((response: HttpResponse<Blob>) => ({
        filename: filenameOf(response.headers.get('Content-Disposition')) ?? fallbackName,
        blob: response.body ?? new Blob(),
      })),
      catchError((error: unknown) => from(withJsonBody(error)).pipe(switchMap((parsed) => throwError(() => parsed)))),
    );
  }
}

/** Nome do arquivo no Content-Disposition (prefere o filename* em UTF-8). */
export function filenameOf(header: string | null): string | null {
  if (!header) {
    return null;
  }
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (encoded) {
    return decodeURIComponent(encoded[1].trim());
  }
  const plain = /filename="?([^";]+)"?/i.exec(header);
  return plain ? plain[1].trim() : null;
}

/** Com responseType blob, o erro também chega como Blob: converte para o JSON do ProblemDetail. */
async function withJsonBody(error: unknown): Promise<unknown> {
  if (!(error instanceof HttpErrorResponse) || !(error.error instanceof Blob)) {
    return error;
  }
  try {
    const body = JSON.parse(await error.error.text());
    return new HttpErrorResponse({
      error: body,
      headers: error.headers,
      status: error.status,
      statusText: error.statusText,
      url: error.url ?? undefined,
    });
  } catch {
    return error;
  }
}
