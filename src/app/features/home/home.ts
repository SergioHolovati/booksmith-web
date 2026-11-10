import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { firstValueFrom } from 'rxjs';

import { ManuscriptApi } from '../../core/api/manuscript.api';
import { problemMessage } from '../../core/api/problem';
import { AuthService } from '../../core/auth/auth.service';
import { BookSummary } from '../../core/models/api.models';
import { formatCount } from '../../core/util/word-count';
import { BookCoverComponent } from '../books/book-cover';
import { WritingGoalCardComponent } from './writing-goal-card';

@Component({
  selector: 'app-home',
  imports: [RouterLink, DatePipe, ButtonModule, ProgressSpinnerModule, BookCoverComponent, WritingGoalCardComponent],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class HomeComponent {
  private readonly api = inject(ManuscriptApi);
  private readonly auth = inject(AuthService);

  readonly firstName = computed(() => this.auth.user()?.displayName.split(' ')[0] ?? 'Escritor');
  readonly books = signal<BookSummary[]>([]);
  readonly totalBooks = signal(0);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  /** Livros vêm ordenados por atividade: o primeiro é o que a pessoa escreveu por último. */
  readonly current = computed(() => this.books()[0] ?? null);
  readonly recent = computed(() => this.books().slice(1, 5));
  readonly totalWords = computed(() => this.books().reduce((sum, b) => sum + b.wordCount, 0));
  readonly totalChapters = computed(() => this.books().reduce((sum, b) => sum + b.chapterCount, 0));
  readonly formatCount = formatCount;

  constructor() {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const page = await firstValueFrom(this.api.listBooks(0, 50));
      this.books.set(page.content);
      this.totalBooks.set(page.totalElements);
    } catch (error) {
      this.error.set(problemMessage(error, 'Não foi possível carregar seus livros.'));
    } finally {
      this.loading.set(false);
    }
  }
}
