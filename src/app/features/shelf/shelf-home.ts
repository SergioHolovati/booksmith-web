import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { firstValueFrom } from 'rxjs';

import { problemMessage } from '../../core/api/problem';
import { BrowseFilter, Rating, ShelfApi, WorkCard, WorkStatus } from '../../core/api/shelf.api';
import { AuthService } from '../../core/auth/auth.service';
import { ShelfHeaderComponent } from './shelf-header';
import { RATINGS, RATING_LABEL, STATUS_LABEL } from './shelf-labels';
import { WorkCardsComponent } from './work-cards';

type Kind = 'all' | 'original' | 'fanfic';

/** Os filtros escolhidos viram os parâmetros da busca. */
export function toFilter(query: string, kind: Kind, maxRating: Rating | null, status: WorkStatus | null): BrowseFilter {
  return {
    q: query.trim() || undefined,
    fanfic: kind === 'all' ? undefined : kind === 'fanfic',
    maxRating: maxRating ?? undefined,
    status: status ?? undefined,
  };
}

/**
 * Vitrine da Estante (`/estante`): obras publicadas, da atualizada mais recentemente para a mais antiga, com busca e
 * filtros. Abre sem login. Com login, mostra antes as novidades de quem a pessoa segue.
 */
@Component({
  selector: 'app-shelf-home',
  imports: [FormsModule, InputTextModule, ProgressSpinnerModule, ShelfHeaderComponent, WorkCardsComponent],
  template: `
    <app-shelf-header />
    <main class="shelf">
      <h1 class="title">Estante</h1>
      <p class="muted lead">Histórias de quem escreve no Booksmith. Ler é sempre de graça.</p>

      <form class="search" role="search" (ngSubmit)="load()">
        <input pInputText type="search" name="q" [(ngModel)]="query" placeholder="Título, sinopse ou fandom"
          aria-label="Buscar na Estante" data-shelf-search />
      </form>

      <div class="filters">
        <div class="chips" role="group" aria-label="Tipo">
          @for (k of kinds; track k.value) {
            <button type="button" class="chip" [class.on]="kind() === k.value" [attr.aria-pressed]="kind() === k.value"
              (click)="setKind(k.value)" [attr.data-kind]="k.value">{{ k.label }}</button>
          }
        </div>
        <div class="chips" role="group" aria-label="Classificação">
          @for (r of ratings; track r) {
            <button type="button" class="chip" [class.on]="maxRating() === r" [attr.aria-pressed]="maxRating() === r"
              (click)="setRating(r)" [attr.data-max-rating]="r">até {{ ratingLabel[r] }}</button>
          }
        </div>
        <div class="chips" role="group" aria-label="Situação">
          @for (s of statuses; track s) {
            <button type="button" class="chip" [class.on]="status() === s" [attr.aria-pressed]="status() === s"
              (click)="setStatus(s)" [attr.data-status]="s">{{ statusLabel[s] }}</button>
          }
        </div>
      </div>

      @if (following().length > 0) {
        <section class="block" data-shelf-following>
          <h2>De quem você segue</h2>
          <app-work-cards [works]="following()" />
        </section>
      }

      <section class="block">
        <h2>Atualizadas recentemente</h2>
        @if (error(); as text) {
          <p class="muted">{{ text }}</p>
        } @else if (loading() && works().length === 0) {
          <div class="center"><p-progress-spinner strokeWidth="4" /></div>
        } @else if (works().length === 0) {
          <p class="muted empty" data-shelf-empty>Nenhuma obra encontrada com esses filtros.</p>
        } @else {
          <app-work-cards [works]="works()" data-shelf-works />
        }
      </section>
    </main>
  `,
  styleUrl: './shelf.scss',
  styles: `
    .title { margin: 1rem 0 .2rem; font-size: 1.6rem; }
    .lead { margin: 0 0 .8rem; }
    .search input { width: 100%; }
    .filters { display: flex; flex-direction: column; gap: .5rem; margin: .7rem 0 1rem; }
    .block { margin-bottom: 1.4rem; }
    h2 { font-size: 1rem; color: var(--bs-text-soft); margin: 0 0 .6rem; }
  `,
})
export class ShelfHomeComponent {
  private readonly api = inject(ShelfApi);
  private readonly auth = inject(AuthService);

  readonly kinds: { value: Kind; label: string }[] = [
    { value: 'all', label: 'Tudo' },
    { value: 'original', label: 'Originais' },
    { value: 'fanfic', label: 'Fanfics' },
  ];
  readonly ratings = RATINGS.filter((r) => r !== '16');
  readonly statuses: WorkStatus[] = ['complete', 'ongoing'];
  readonly ratingLabel = RATING_LABEL;
  readonly statusLabel = STATUS_LABEL;

  query = '';
  readonly kind = signal<Kind>('all');
  readonly maxRating = signal<Rating | null>(null);
  readonly status = signal<WorkStatus | null>(null);
  readonly works = signal<WorkCard[]>([]);
  readonly following = signal<WorkCard[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    queueMicrotask(() => {
      void this.load();
      if (this.auth.isAuthenticated()) {
        void firstValueFrom(this.api.following()).then((w) => this.following.set(w.slice(0, 4))).catch(() => undefined);
      }
    });
  }

  setKind(kind: Kind): void {
    this.kind.set(kind);
    void this.load();
  }

  setRating(rating: Rating): void {
    this.maxRating.set(this.maxRating() === rating ? null : rating);
    void this.load();
  }

  setStatus(status: WorkStatus): void {
    this.status.set(this.status() === status ? null : status);
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.works.set(await firstValueFrom(this.api.browse(toFilter(this.query, this.kind(), this.maxRating(), this.status()))));
    } catch (error) {
      this.error.set(problemMessage(error, 'Não foi possível abrir a Estante.'));
    } finally {
      this.loading.set(false);
    }
  }
}
