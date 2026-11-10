import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { JSONContent } from '@tiptap/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  BookDetail,
  BookRequest,
  BookSummary,
  UniverseMove,
  Chapter,
  ChapterSummary,
  ChapterVersionDetail,
  ChapterVersionSummary,
  ImportMode,
  ImportPlan,
  Page,
  SaveResult,
  TrashItem, MentionedIn, ChapterNote } from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class ManuscriptApi {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  listBooks(page = 0, size = 12): Observable<Page<BookSummary>> {
    return this.http.get<Page<BookSummary>>(`${this.base}/books`, { params: { page, size } });
  }

  getBook(bookId: string): Observable<BookDetail> {
    return this.http.get<BookDetail>(`${this.base}/books/${bookId}`);
  }

  createBook(request: BookRequest): Observable<BookDetail> {
    return this.http.post<BookDetail>(`${this.base}/books`, request);
  }

  updateBook(bookId: string, request: BookRequest): Observable<BookDetail> {
    return this.http.put<BookDetail>(`${this.base}/books/${bookId}`, request);
  }

  /** Leva o livro para outro universo (série); se era o único do universo antigo, tudo vai junto. */
  moveToUniverse(bookId: string, universeId: string): Observable<UniverseMove> {
    return this.http.put<UniverseMove>(`${this.base}/books/${bookId}/universe`, { universeId });
  }

  deleteBook(bookId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/books/${bookId}`);
  }

  createChapter(bookId: string, title?: string): Observable<Chapter> {
    return this.http.post<Chapter>(`${this.base}/books/${bookId}/chapters`, { title: title ?? null });
  }

  reorderChapters(bookId: string, chapterIds: string[]): Observable<ChapterSummary[]> {
    return this.http.put<ChapterSummary[]>(`${this.base}/books/${bookId}/chapters/order`, { chapterIds });
  }

  /** Notas do autor no capítulo (privadas: não saem no livro exportado). */
  listNotes(chapterId: string): Observable<ChapterNote[]> {
    return this.http.get<ChapterNote[]>(`${this.base}/chapters/${chapterId}/notes`);
  }

  /** `id`: o threadId que o editor pôs na marca do trecho. */
  createNote(chapterId: string, note: { id: string; body: string; quote: string | null }): Observable<ChapterNote> {
    return this.http.post<ChapterNote>(`${this.base}/chapters/${chapterId}/notes`, note);
  }

  updateNote(id: string, change: { body?: string; resolved?: boolean }): Observable<ChapterNote> {
    return this.http.patch<ChapterNote>(`${this.base}/notes/${id}`, change);
  }

  deleteNote(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/notes/${id}`);
  }

  /** Capítulos da pessoa que mencionam este personagem, lugar ou ficha com "@". */
  mentions(entityId: string): Observable<MentionedIn[]> {
    return this.http.get<MentionedIn[]>(`${this.base}/mentions/${entityId}`);
  }

  getChapter(chapterId: string): Observable<Chapter> {
    return this.http.get<Chapter>(`${this.base}/chapters/${chapterId}`);
  }

  /** Autosave com controle de versão: 409 se outro dispositivo salvou antes. */
  saveChapterContent(chapterId: string, version: number, content: JSONContent): Observable<SaveResult> {
    return this.http.put<SaveResult>(
      `${this.base}/chapters/${chapterId}/content`,
      { content },
      { headers: new HttpHeaders({ 'If-Match': `"${version}"` }) },
    );
  }

  renameChapter(chapterId: string, title: string): Observable<ChapterSummary> {
    return this.http.patch<ChapterSummary>(`${this.base}/chapters/${chapterId}`, { title });
  }

  deleteChapter(chapterId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/chapters/${chapterId}`);
  }

  // ===== Histórico de versões =====

  listVersions(chapterId: string): Observable<ChapterVersionSummary[]> {
    return this.http.get<ChapterVersionSummary[]>(`${this.base}/chapters/${chapterId}/versions`);
  }

  getVersion(chapterId: string, versionId: string): Observable<ChapterVersionDetail> {
    return this.http.get<ChapterVersionDetail>(`${this.base}/chapters/${chapterId}/versions/${versionId}`);
  }

  saveVersion(chapterId: string, label: string | null): Observable<ChapterVersionSummary> {
    return this.http.post<ChapterVersionSummary>(`${this.base}/chapters/${chapterId}/versions`, { label });
  }

  /** Volta o capítulo para a versão escolhida (If-Match com a versão atual, como o autosave). */
  restoreVersion(chapterId: string, versionId: string, currentVersion: number): Observable<Chapter> {
    return this.http.post<Chapter>(
      `${this.base}/chapters/${chapterId}/versions/${versionId}/restore`,
      {},
      { headers: new HttpHeaders({ 'If-Match': `"${currentVersion}"` }) },
    );
  }

  // ===== Lixeira =====

  listTrash(): Observable<TrashItem[]> {
    return this.http.get<TrashItem[]>(`${this.base}/me/trash`);
  }

  restoreFromTrash(item: Pick<TrashItem, 'type' | 'id'>): Observable<unknown> {
    const kind = item.type === 'BOOK' ? 'books' : 'chapters';
    return this.http.post(`${this.base}/me/trash/${kind}/${item.id}/restore`, {});
  }

  /** Prévia ({@code dryRun}) ou importação de .docx, .odt, .md ou .txt; os capítulos entram no fim do livro. */
  importFile(bookId: string, file: File, mode: ImportMode, dryRun: boolean): Observable<ImportPlan> {
    const form = new FormData();
    form.append('file', file, file.name);
    return this.http.post<ImportPlan>(`${this.base}/books/${bookId}/import`, form, {
      params: { mode, dryRun },
    });
  }
}
