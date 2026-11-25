import { Component, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { Router } from '@angular/router';
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
type Sort = 'recent' | 'popular';

const HIDDEN_TAGS_KEY = 'booksmith.shelf.hiddenTags';

export interface BrowseChoices {
  query: string;
  kind: Kind;
  maxRating: Rating | null;
  status: WorkStatus | null;
  tag?: string | null;
  hiddenTags?: string[];
  sort?: Sort;
}

/** Os filtros escolhidos viram os parâmetros da busca. */
export function toFilter(c: BrowseChoices): BrowseFilter {
  return {
    q: c.query.trim() || undefined,
    fanfic: c.kind === 'all' ? undefined : c.kind === 'fanfic',
    maxRating: c.maxRating ?? undefined,
    status: c.status ?? undefined,
    tag: c.tag || undefined,
    excludeTags: c.hiddenTags?.length ? c.hiddenTags : undefined,
    sort: c.sort === 'popular' ? 'popular' : undefined,
  };
}

/** "Spoiler, morte  ,#incesto" → ["spoiler", "morte", "incesto"]. */
export function parseHiddenTags(text: string): string[] {
  return [...new Set(text.split(',').map((t) => t.trim().replace(/^#/, '').trim().toLowerCase()).filter(Boolean))].slice(0, 20);
}

/**
 * Vitrine da Estante (`/estante`): obras publicadas, recentes ou em alta, com busca, filtros, tag (`?tag=`) e tags
 * escondidas (lembradas no aparelho). Abre sem login. Com login, mostra antes as novidades de quem a pessoa segue.
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
        <div class="chips" role="group" aria-label="Ordem">
          <button type="button" class="chip" [class.on]="sort() === 'recent'" (click)="setSort('recent')" data-sort="recent">Recentes</button>
          <button type="button" class="chip" [class.on]="sort() === 'popular'" (click)="setSort('popular')" data-sort="popular">
            <i class="pi pi-bolt" aria-hidden="true"></i> Em alta</button>
        </div>
        @if (activeTag(); as t) {
          <div class="chips">
            <button type="button" class="chip on" (click)="clearTag()" [attr.aria-label]="'Tirar o filtro da tag ' + t"
              data-active-tag>#{{ t }} <i class="pi pi-times" aria-hidden="true"></i></button>
          </div>
        }
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
        <details class="hide-tags" [open]="hiddenTags().length > 0">
          <summary class="small">Esconder obras com estas tags
            @if (hiddenTags().length > 0) { ({{ hiddenTags().length }}) }</summary>
          <form (ngSubmit)="saveHidden()" class="hide-form">
            <input pInputText name="hidden" [(ngModel)]="hiddenText" placeholder="ex.: spoiler, morte de personagem"
              aria-label="Tags para esconder, separadas por vírgula" data-hidden-tags />
            <button type="submit" class="chip">Aplicar</button>
          </form>
        </details>
      </div>

      @if (following().length > 0 && !activeTag()) {
        <section class="block" data-shelf-following>
          <h2>De quem você segue</h2>
          <app-work-cards [works]="following()" />
        </section>
      }

      <section class="block">
        <h2>{{ sort() === 'popular' ? 'Em alta nesta semana' : 'Atualizadas recentemente' }}</h2>
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
    .hide-tags summary { min-height: var(--bs-touch); display: flex; align-items: center; cursor: pointer;
      color: var(--bs-text-soft); }
    .hide-form { display: flex; gap: .4rem; }
    .hide-form input { flex: 1; min-width: 0; }
  `,
})
export class ShelfHomeComponent {
  private readonly api = inject(ShelfApi);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  /** ?tag= (vem da tag tocada na ficha de uma obra). */
  readonly tag = input<string>('');

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
  hiddenText = '';
  readonly kind = signal<Kind>('all');
  readonly maxRating = signal<Rating | null>(null);
  readonly status = signal<WorkStatus | null>(null);
  readonly sort = signal<Sort>('recent');
  readonly activeTag = signal<string | null>(null);
  readonly hiddenTags = signal<string[]>([]);
  readonly works = signal<WorkCard[]>([]);
  readonly following = signal<WorkCard[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    inject(Title).setTitle('Estante · Booksmith');
    try {
      this.hiddenTags.set(parseHiddenTags(localStorage.getItem(HIDDEN_TAGS_KEY) ?? ''));
      this.hiddenText = this.hiddenTags().join(', ');
    } catch {
      // Sem armazenamento: nada escondido
    }
    effect(() => {
      this.activeTag.set(this.tag() || null);
      queueMicrotask(() => void this.load());
    });
    queueMicrotask(() => {
      if (this.auth.isAuthenticated()) {
        void firstValueFrom(this.api.following()).then((w) => this.following.set(w.slice(0, 4))).catch(() => undefined);
      }
    });
  }

  setSort(sort: Sort): void {
    this.sort.set(sort);
    void this.load();
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

  clearTag(): void {
    void this.router.navigate(['/estante']);
  }

  saveHidden(): void {
    const tags = parseHiddenTags(this.hiddenText);
    this.hiddenTags.set(tags);
    this.hiddenText = tags.join(', ');
    try {
      localStorage.setItem(HIDDEN_TAGS_KEY, tags.join(','));
    } catch {
      // Vale só nesta visita
    }
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.works.set(await firstValueFrom(this.api.browse(toFilter({
        query: this.query, kind: this.kind(), maxRating: this.maxRating(), status: this.status(),
        tag: this.activeTag(), hiddenTags: this.hiddenTags(), sort: this.sort(),
      }))));
    } catch (error) {
      this.error.set(problemMessage(error, 'Não foi possível abrir a Estante.'));
    } finally {
      this.loading.set(false);
    }
  }
}
