import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';

/** Topo das páginas da Estante (abrem sem login): a marca, a biblioteca e o caminho de volta para escrever. */
@Component({
  selector: 'app-shelf-header',
  imports: [RouterLink],
  template: `
    <header class="shelf-header">
      <a routerLink="/estante" class="brand" data-shelf-home>
        <span class="brand-icon" aria-hidden="true">⚒</span> Estante
      </a>
      <nav class="links" aria-label="Estante">
        @if (auth.isAuthenticated()) {
          <a routerLink="/estante/biblioteca" data-shelf-library-link><i class="pi pi-bookmark" aria-hidden="true"></i>
            Biblioteca</a>
          <a routerLink="/home" class="write"><i class="pi pi-pencil" aria-hidden="true"></i> Escrever</a>
        } @else {
          <a routerLink="/login" data-shelf-login>Entrar</a>
          <a routerLink="/register" class="write">Criar conta</a>
        }
      </nav>
    </header>
  `,
  styles: `
    .shelf-header {
      position: sticky; top: 0; z-index: 10;
      display: flex; align-items: center; justify-content: space-between; gap: .5rem;
      max-width: 960px; margin: 0 auto;
      padding: calc(.5rem + var(--bs-safe-top)) var(--bs-gutter) .5rem;
      background: var(--bs-bg);
      border-bottom: 1px solid var(--bs-border);
    }
    .brand { display: inline-flex; align-items: center; gap: .4rem; min-height: var(--bs-touch);
      font-weight: 700; font-size: 1.1rem; color: var(--bs-text); }
    .brand-icon { color: var(--bs-ember); }
    .links { display: flex; align-items: center; gap: .9rem; }
    .links a { display: inline-flex; align-items: center; gap: .3rem; min-height: var(--bs-touch);
      color: var(--bs-text-soft); font-size: .9rem; }
    .links a.write { color: var(--bs-ember); }
  `,
})
export class ShelfHeaderComponent {
  readonly auth = inject(AuthService);
}
