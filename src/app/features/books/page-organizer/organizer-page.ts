import { Component, inject, input, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ManuscriptApi } from '../../../core/api/manuscript.api';
import { isPictureBook } from '../book-labels';
import { PageOrganizerComponent } from './page-organizer';
import { TextOrganizerComponent } from './text-organizer';

/** A tela de organizar páginas: a do livro ilustrado (página a página) ou a do livro de texto (trecho a trecho). */
@Component({
  selector: 'app-organizer-page',
  imports: [PageOrganizerComponent, TextOrganizerComponent],
  template: `
    @switch (picture()) {
      @case (true) {
        <app-page-organizer [bookId]="bookId()" />
      }
      @case (false) {
        <app-text-organizer [bookId]="bookId()" />
      }
    }
  `,
})
export class OrganizerPageComponent {
  private readonly api = inject(ManuscriptApi);

  readonly bookId = input.required<string>();
  /** null enquanto carrega. */
  readonly picture = signal<boolean | null>(null);

  constructor() {
    queueMicrotask(() => {
      firstValueFrom(this.api.getBook(this.bookId())).then(
        (book) => this.picture.set(book.pictureBook ?? isPictureBook(book.genre)),
        // Sem o livro, a tela de texto mostra o erro
        () => this.picture.set(false),
      );
    });
  }
}
