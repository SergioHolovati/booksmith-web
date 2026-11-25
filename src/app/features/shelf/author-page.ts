import { Component, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { firstValueFrom } from 'rxjs';

import { problemMessage } from '../../core/api/problem';
import { AuthorPage, ShelfApi } from '../../core/api/shelf.api';
import { AuthService } from '../../core/auth/auth.service';
import { ShelfHeaderComponent } from './shelf-header';
import { WorkCardsComponent } from './work-cards';

/** Página do autor na Estante (`/estante/autor/:authorId`): o nome público, seguidores, seguir e as obras. */
@Component({
  selector: 'app-author-page',
  imports: [RouterLink, ButtonModule, ProgressSpinnerModule, ShelfHeaderComponent, WorkCardsComponent],
  template: `
    <app-shelf-header />
    <main class="shelf">
      @if (page(); as p) {
        <div class="author-head" data-author-page>
          <span class="avatar" aria-hidden="true">{{ p.name.charAt(0).toUpperCase() }}</span>
          <div>
            <h1>{{ p.name }}</h1>
            <p class="small muted" data-author-followers>{{ p.followers }} {{ p.followers === 1 ? 'seguidor' : 'seguidores' }}</p>
          </div>
          @if (auth.isAuthenticated() && auth.user()?.id !== p.id) {
            <p-button [label]="p.following ? 'Seguindo' : 'Seguir'" [icon]="p.following ? 'pi pi-check' : 'pi pi-user-plus'"
              size="small" [outlined]="p.following" (onClick)="toggleFollow()" data-author-follow />
          }
        </div>
        @if (p.works.length === 0) {
          <p class="muted empty">Nenhuma obra pública ainda.</p>
        } @else {
          <app-work-cards [works]="p.works" />
        }
      } @else if (error(); as text) {
        <p class="muted empty">{{ text }} <a routerLink="/estante">Voltar à Estante</a></p>
      } @else {
        <div class="center"><p-progress-spinner strokeWidth="4" /></div>
      }
    </main>
  `,
  styleUrl: './shelf.scss',
  styles: `
    .author-head { display: flex; align-items: center; gap: .8rem; padding: 1rem 0; flex-wrap: wrap; }
    .avatar { width: 56px; height: 56px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
      background: var(--bs-sand-soft); color: var(--bs-sand); font-size: 1.5rem; font-weight: 700; }
    h1 { font-size: 1.4rem; margin: 0; }
    p { margin: 0; }
  `,
})
export class AuthorPageComponent {
  private readonly api = inject(ShelfApi);
  readonly auth = inject(AuthService);

  readonly authorId = input.required<string>();
  readonly page = signal<AuthorPage | null>(null);
  readonly error = signal<string | null>(null);

  constructor() {
    queueMicrotask(() => void this.load());
  }

  async load(): Promise<void> {
    try {
      this.page.set(await firstValueFrom(this.api.author(this.authorId())));
    } catch (error) {
      this.error.set(problemMessage(error, 'Não foi possível abrir a página do autor.'));
    }
  }

  async toggleFollow(): Promise<void> {
    const p = this.page();
    if (!p) {
      return;
    }
    const follow = !p.following;
    await firstValueFrom(this.api.follow(p.id, follow));
    this.page.set({ ...p, following: follow, followers: p.followers + (follow ? 1 : -1) });
  }
}
