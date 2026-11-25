import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

export type Rating = 'L' | '10' | '12' | '14' | '16';
export type AiUse = 'none' | 'assisted' | 'generated';
export type WorkStatus = 'ongoing' | 'complete' | 'hiatus';
export type Visibility = 'public' | 'unlisted';
export type ReportReason = 'plagiarism' | 'rating' | 'hate' | 'sexual' | 'minor_safety' | 'spam' | 'other';

/** Uma obra na vitrine, na biblioteca e na página do autor. */
export interface WorkCard {
  id: string;
  slug: string;
  title: string;
  synopsis: string | null;
  coverUrl: string | null;
  genre: string;
  fanfic: boolean;
  fandom: string | null;
  rating: Rating;
  warnings: string[];
  tags: string[];
  aiUse: AiUse;
  status: WorkStatus;
  authorId: string;
  authorName: string;
  chapters: number;
  words: number;
  likes: number;
  updatedAt: string;
}

/** O que é da pessoa logada nesta obra; `lastChapter` 0 = ainda não leu. */
export interface ReaderState {
  mine: boolean;
  followingAuthor: boolean;
  inLibrary: boolean;
  lastChapter: number;
  progress: number;
}

export interface WorkDetail {
  work: WorkCard;
  chapters: { number: number; title: string; words: number; updatedAt: string }[];
  /** null quando não há login. */
  reader: ReaderState | null;
}

export interface ChapterView {
  workSlug: string;
  workTitle: string;
  authorId: string;
  authorName: string;
  rating: Rating;
  warnings: string[];
  number: number;
  total: number;
  title: string;
  /** Gerado no servidor só com os nós do editor e o texto escapado. */
  html: string;
  words: number;
  updatedAt: string;
  likes: number;
  liked: boolean;
  comments: number;
}

export interface ShelfComment {
  id: string;
  authorId: string;
  /** null = quem comentou não tem perfil de autor ("Leitor"). */
  authorName: string | null;
  body: string;
  createdAt: string;
  mine: boolean;
}

export interface AuthorPage {
  id: string;
  name: string;
  followers: number;
  following: boolean;
  works: WorkCard[];
}

export interface BrowseFilter {
  q?: string;
  genre?: string;
  fanfic?: boolean;
  tag?: string;
  maxRating?: Rating;
  status?: WorkStatus;
  page?: number;
}

/** Como o livro está na Estante (painel do autor). */
export interface Publication {
  workId: string;
  slug: string;
  rating: Rating;
  warnings: string[];
  tags: string[];
  aiUse: AiUse;
  status: WorkStatus;
  visibility: Visibility;
  publishedAt: string;
  updatedAt: string;
  removedAt: string | null;
  removedReason: string | null;
  chapters: { chapterId: string; position: number; title: string; words: number; edition: number; updatedAt: string }[];
}

export interface PublishRequest {
  rating: Rating;
  warnings: string[];
  tags: string[];
  aiUse: AiUse;
  status: WorkStatus;
  visibility: Visibility;
  /** null = todos os capítulos. */
  chapterIds: string[] | null;
}

@Injectable({ providedIn: 'root' })
export class ShelfApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/shelf`;

  browse(filter: BrowseFilter): Observable<WorkCard[]> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filter)) {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    }
    return this.http.get<WorkCard[]>(`${this.base}/works`, { params });
  }

  work(slug: string): Observable<WorkDetail> {
    return this.http.get<WorkDetail>(`${this.base}/works/${encodeURIComponent(slug)}`);
  }

  chapter(slug: string, number: number): Observable<ChapterView> {
    return this.http.get<ChapterView>(`${this.base}/works/${encodeURIComponent(slug)}/chapters/${number}`);
  }

  comments(slug: string, number: number): Observable<ShelfComment[]> {
    return this.http.get<ShelfComment[]>(`${this.base}/works/${encodeURIComponent(slug)}/chapters/${number}/comments`);
  }

  comment(slug: string, number: number, body: string): Observable<ShelfComment> {
    return this.http.post<ShelfComment>(`${this.base}/works/${encodeURIComponent(slug)}/chapters/${number}/comments`,
      { body });
  }

  deleteComment(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/comments/${id}`);
  }

  like(slug: string, number: number, liked: boolean): Observable<void> {
    const url = `${this.base}/works/${encodeURIComponent(slug)}/chapters/${number}/like`;
    return liked ? this.http.put<void>(url, {}) : this.http.delete<void>(url);
  }

  progress(slug: string, chapter: number, progress: number): Observable<void> {
    return this.http.put<void>(`${this.base}/works/${encodeURIComponent(slug)}/progress`, { chapter, progress });
  }

  library(slug: string, add: boolean): Observable<void> {
    const url = `${this.base}/library/${encodeURIComponent(slug)}`;
    return add ? this.http.put<void>(url, {}) : this.http.delete<void>(url);
  }

  myLibrary(): Observable<WorkCard[]> {
    return this.http.get<WorkCard[]>(`${this.base}/me/library`);
  }

  following(): Observable<WorkCard[]> {
    return this.http.get<WorkCard[]>(`${this.base}/me/following`);
  }

  author(id: string): Observable<AuthorPage> {
    return this.http.get<AuthorPage>(`${this.base}/authors/${id}`);
  }

  follow(authorId: string, follow: boolean): Observable<void> {
    const url = `${this.base}/authors/${authorId}/follow`;
    return follow ? this.http.put<void>(url, {}) : this.http.delete<void>(url);
  }

  report(targetType: 'work' | 'comment', targetId: string, reason: ReportReason, details: string): Observable<void> {
    return this.http.post<void>(`${this.base}/reports`, { targetType, targetId, reason, details });
  }

  // ===== Autor =====

  /** null (204) = ainda não publicado. */
  publication(bookId: string): Observable<Publication | null> {
    return this.http.get<Publication | null>(`${environment.apiBaseUrl}/books/${bookId}/publication`);
  }

  publish(bookId: string, request: PublishRequest): Observable<Publication> {
    return this.http.put<Publication>(`${environment.apiBaseUrl}/books/${bookId}/publication`, request);
  }

  unpublish(bookId: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiBaseUrl}/books/${bookId}/publication`);
  }

  unpublishChapter(bookId: string, chapterId: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiBaseUrl}/books/${bookId}/publication/chapters/${chapterId}`);
  }
}
