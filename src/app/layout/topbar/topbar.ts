import { Component, computed, inject, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { Menu, MenuModule } from 'primeng/menu';

import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-topbar',
  imports: [MenuModule],
  templateUrl: './topbar.html',
  styleUrl: './topbar.scss',
})
export class TopbarComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly menu = viewChild.required<Menu>('menu');

  readonly firstName = computed(() => this.auth.user()?.displayName.split(' ')[0] ?? 'Escritor');
  readonly initial = computed(() => this.firstName().charAt(0).toUpperCase());

  readonly menuItems: MenuItem[] = [
    { label: 'Meu perfil', icon: 'pi pi-user-edit', command: () => this.router.navigate(['/profile']) },
    { label: 'Ajuda', icon: 'pi pi-question-circle', command: () => this.router.navigate(['/ajuda']) },
    { separator: true },
    { label: 'Sair', icon: 'pi pi-sign-out', command: () => this.auth.logout() },
  ];

  toggleMenu(event: Event): void {
    this.menu().toggle(event);
  }
}
