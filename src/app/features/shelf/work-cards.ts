import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { WorkCard } from '../../core/api/shelf.api';
import { RATING_LABEL, STATUS_LABEL, wordsLabel } from './shelf-labels';

/** A lista de obras (vitrine, biblioteca, autor): capa, título, autor, sinopse e o essencial da ficha. */
@Component({
  selector: 'app-work-cards',
  imports: [RouterLink],
  template: `
    <ul class="cards">
      @for (w of works(); track w.id) {
        <li>
          <a class="card glass-card" [routerLink]="['/estante/obra', w.slug]" [attr.data-work]="w.slug">
            @if (w.coverUrl) {
              <img class="cover" [src]="w.coverUrl" alt="" loading="lazy" />
            } @else {
              <span class="cover" aria-hidden="true"><i class="pi pi-book"></i></span>
            }
            <span class="card-body">
              <span class="card-title">{{ w.title }}</span>
              <span class="small muted">por {{ w.authorName }}</span>
              @if (w.synopsis) { <span class="synopsis">{{ w.synopsis }}</span> }
              <span class="meta">
                <span class="badge rating">{{ ratingLabel[w.rating] }}</span>
                @if (w.fanfic) { <span class="badge">Fanfic{{ w.fandom ? ' · ' + w.fandom : '' }}</span> }
                <span class="badge">{{ statusLabel[w.status] }}</span>
                <span class="small muted">{{ w.chapters }} {{ w.chapters === 1 ? 'capítulo' : 'capítulos' }} ·
                  {{ words(w.words) }}</span>
              </span>
            </span>
          </a>
        </li>
      }
    </ul>
  `,
  styleUrl: './shelf.scss',
  host: { style: 'min-height: 0; background: none' },
})
export class WorkCardsComponent {
  readonly works = input.required<WorkCard[]>();
  readonly ratingLabel = RATING_LABEL;
  readonly statusLabel = STATUS_LABEL;
  readonly words = wordsLabel;
}
