import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { NAV_ITEMS } from '../nav-items';

@Component({
  selector: 'app-bottom-nav',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="bottom-nav" aria-label="Navegação principal">
      @for (item of items; track item.link) {
        <a [routerLink]="item.link" routerLinkActive="active" class="nav-item">
          <i [class]="item.icon" aria-hidden="true"></i>
          <span>{{ item.label }}</span>
        </a>
      }
    </nav>
  `,
  styles: `
    .bottom-nav {
      position: fixed;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 30;
      display: flex;
      height: calc(var(--bs-bottom-nav-h) + var(--bs-safe-bottom));
      padding-bottom: var(--bs-safe-bottom);
      background: rgba(11, 11, 11, 0.92);
      border-top: 1px solid var(--bs-border);
      backdrop-filter: var(--bs-blur);
      -webkit-backdrop-filter: var(--bs-blur);
    }

    .nav-item {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
      color: var(--bs-muted);
      font-size: 0.72rem;
      font-weight: 500;
    }

    .nav-item .pi {
      font-size: 1.25rem;
    }

    .nav-item.active {
      color: var(--bs-ember);
    }
  `,
})
export class BottomNavComponent {
  readonly items = NAV_ITEMS;
}
