import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { firstValueFrom } from 'rxjs';

import { ManuscriptApi } from '../../../core/api/manuscript.api';
import { problemMessage } from '../../../core/api/problem';
import { BookSummary } from '../../../core/models/api.models';
import { formatCount } from '../../../core/util/word-count';
import { BookCoverComponent } from '../book-cover';
import { KIND_LABEL, STATUS_LABEL } from '../book-labels';

const PAGE_SIZE = 12;

@Component({
  selector: 'app-book-list',
  imports: [RouterLink, DatePipe, ButtonModule, ProgressSpinnerModule, BookCoverComponent],
  templateUrl: './book-list.html',
  styleUrl: './book-list.scss',
})
export class BookListComponent {
  private readonly api = inject(ManuscriptApi);

  readonly books = signal<BookSummary[]>([]);
  readonly page = signal(0);
  readonly totalPages = signal(0);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly hasMore = computed(() => this.page() + 1 < this.totalPages());

  readonly statusLabel = STATUS_LABEL;
  readonly kindLabel = KIND_LABEL;
  readonly formatCount = formatCount;

  constructor() {
    void this.load(0);
  }

  /** "Carregar mais" em vez de páginas numeradas: mais natural no celular. */
  async load(page: number): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const result = await firstValueFrom(this.api.listBooks(page, PAGE_SIZE));
      this.books.update((current) => (page === 0 ? result.content : [...current, ...result.content]));
      this.page.set(result.page);
      this.totalPages.set(result.totalPages);
    } catch (error) {
      this.error.set(problemMessage(error, 'Não foi possível carregar seus livros.'));
    } finally {
      this.loading.set(false);
    }
  }
}
