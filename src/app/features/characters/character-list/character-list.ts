import { Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { firstValueFrom } from 'rxjs';

import { ManuscriptApi } from '../../../core/api/manuscript.api';
import { problemMessage } from '../../../core/api/problem';
import { UniverseApi } from '../../../core/api/universe.api';
import { BookDetail, CharacterSummary } from '../../../core/models/api.models';
import { ROLE_LABEL } from '../character-labels';

/** Personagens do livro (do universo dele): lista e criação rápida pelo nome. */
@Component({
  selector: 'app-character-list',
  imports: [RouterLink, FormsModule, ButtonModule, InputTextModule, ProgressSpinnerModule],
  templateUrl: './character-list.html',
  styleUrl: './character-list.scss',
})
export class CharacterListComponent {
  private readonly manuscript = inject(ManuscriptApi);
  private readonly universe = inject(UniverseApi);
  private readonly router = inject(Router);
  private readonly toast = inject(MessageService);

  readonly bookId = input.required<string>();

  readonly book = signal<BookDetail | null>(null);
  readonly characters = signal<CharacterSummary[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly creating = signal(false);
  readonly roleLabel = ROLE_LABEL;
  newName = '';

  constructor() {
    queueMicrotask(() => void this.load());
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const book = await firstValueFrom(this.manuscript.getBook(this.bookId()));
      this.book.set(book);
      this.characters.set(await firstValueFrom(this.universe.listCharacters(book.universeId)));
    } catch (error) {
      this.error.set(problemMessage(error, 'Não foi possível carregar os personagens.'));
    } finally {
      this.loading.set(false);
    }
  }

  async create(): Promise<void> {
    const book = this.book();
    const name = this.newName.trim();
    if (!book || !name) {
      return;
    }
    this.creating.set(true);
    try {
      const character = await firstValueFrom(this.universe.createCharacter(book.universeId, name));
      this.newName = '';
      await this.router.navigate(['/books', this.bookId(), 'characters', character.id]);
    } catch (error) {
      this.toast.add({ severity: 'error', summary: problemMessage(error) });
    } finally {
      this.creating.set(false);
    }
  }

  initial(name: string): string {
    return name.trim().charAt(0).toUpperCase();
  }
}
