import { Component, input } from '@angular/core';

/** Capa do livro ou, sem imagem, um placeholder com a inicial do título. */
@Component({
  selector: 'app-book-cover',
  template: `
    @if (url()) {
      <img [src]="url()" [alt]="'Capa de ' + title()" loading="lazy" />
    } @else {
      <div class="placeholder" aria-hidden="true">{{ title().charAt(0).toUpperCase() || '?' }}</div>
    }
  `,
  styles: `
    :host {
      display: block;
      aspect-ratio: 2 / 3;
      border-radius: var(--bs-radius-sm);
      overflow: hidden;
      background: #1a1410;
    }
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .placeholder {
      width: 100%;
      height: 100%;
      display: grid;
      place-items: center;
      font: 600 2rem var(--bs-font-prose);
      color: var(--bs-sand);
      background: linear-gradient(160deg, rgba(255, 122, 26, .22), rgba(214, 160, 106, .05));
    }
  `,
})
export class BookCoverComponent {
  readonly url = input<string | null>(null);
  readonly title = input('');
}
