import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { firstValueFrom } from 'rxjs';

import { ManuscriptApi } from '../../core/api/manuscript.api';
import { problemMessage } from '../../core/api/problem';
import { UniverseApi } from '../../core/api/universe.api';
import { BookSummary, Universe } from '../../core/models/api.models';
import { BookCoverComponent } from '../books/book-cover';

/** Tamanho máximo de página da API de livros. */
const PAGE_SIZE = 50;

export interface UniverseCard {
  universe: Universe;
  books: BookSummary[];
}

/** Junta cada universo aos seus livros; universos com mais livros (séries) vêm primeiro. */
export function groupBooks(universes: Universe[], books: BookSummary[]): UniverseCard[] {
  return universes
    .map((universe) => ({ universe, books: books.filter((b) => b.universeId === universe.id) }))
    .sort((a, b) => b.books.length - a.books.length || a.universe.name.localeCompare(b.universe.name, 'pt-BR'));
}

/**
 * Universos do autor (§4.2 do produto): cada um com seus livros. Uma série vive num universo só, e os livros
 * dela usam os mesmos personagens, lugares e linha do tempo.
 */
@Component({
  selector: 'app-universe-list',
  imports: [RouterLink, FormsModule, ButtonModule, InputTextModule, ProgressSpinnerModule, BookCoverComponent],
  templateUrl: './universe-list.html',
  styleUrl: './universe-list.scss',
})
export class UniverseListComponent {
  private readonly universeApi = inject(UniverseApi);
  private readonly manuscriptApi = inject(ManuscriptApi);
  private readonly toast = inject(MessageService);
  private readonly router = inject(Router);

  readonly universes = signal<Universe[]>([]);
  readonly books = signal<BookSummary[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly cards = computed(() => groupBooks(this.universes(), this.books()));

  /** Universo com o nome em edição, e o texto digitado. */
  readonly renaming = signal<string | null>(null);
  readonly newName = signal('');
  readonly saving = signal(false);
  readonly creating = signal(false);

  constructor() {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const [universes, books] = await Promise.all([firstValueFrom(this.universeApi.listUniverses()), this.allBooks()]);
      this.universes.set(universes);
      this.books.set(books);
    } catch (error) {
      this.error.set(problemMessage(error, 'Não foi possível carregar seus universos.'));
    } finally {
      this.loading.set(false);
    }
  }

  private async allBooks(): Promise<BookSummary[]> {
    const books: BookSummary[] = [];
    for (let page = 0; ; page++) {
      const result = await firstValueFrom(this.manuscriptApi.listBooks(page, PAGE_SIZE));
      books.push(...result.content);
      if (page + 1 >= result.totalPages) {
        return books;
      }
    }
  }

  /** Universo antes do livro: cria e abre o construtor, onde o nome se troca. */
  async create(): Promise<void> {
    this.creating.set(true);
    try {
      const universe = await firstValueFrom(this.universeApi.createUniverse('Novo universo'));
      await this.router.navigate(['/universes', universe.id]);
    } catch (error) {
      this.toast.add({ severity: 'error', summary: problemMessage(error, 'Não foi possível criar o universo.') });
    } finally {
      this.creating.set(false);
    }
  }

  startRename(universe: Universe): void {
    this.renaming.set(universe.id);
    this.newName.set(universe.name);
  }

  async rename(universe: Universe): Promise<void> {
    const name = this.newName().trim();
    if (!name || name === universe.name) {
      this.renaming.set(null);
      return;
    }
    this.saving.set(true);
    try {
      const saved = await firstValueFrom(this.universeApi.renameUniverse(universe.id, name));
      this.universes.update((list) => list.map((u) => (u.id === saved.id ? saved : u)));
      this.renaming.set(null);
    } catch (error) {
      this.toast.add({ severity: 'error', summary: problemMessage(error, 'Não foi possível renomear.') });
    } finally {
      this.saving.set(false);
    }
  }
}
