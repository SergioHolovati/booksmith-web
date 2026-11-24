import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { firstValueFrom } from 'rxjs';

import { problemMessage } from '../../core/api/problem';
import { SupportApi } from '../../core/api/support.api';
import { SupportRequest } from '../../core/models/api.models';
import { SUPPORT_CATEGORIES } from './support-form';

export const SUPPORT_STATUS: Record<SupportRequest['status'], string> = {
  open: 'Aguardando a equipe',
  waiting_user: 'Respondido',
  resolved: 'Resolvido',
};

/**
 * "Meus pedidos" (`/ajuda/pedidos`): o que a pessoa já mandou ao suporte, com protocolo e situação. Tocar abre a
 * conversa com a equipe.
 */
@Component({
  selector: 'app-support-requests',
  imports: [DatePipe, RouterLink, ButtonModule, ProgressSpinnerModule],
  template: `
    <div class="page narrow">
      <a routerLink="/ajuda" class="back-link"><i class="pi pi-arrow-left"></i> Ajuda</a>
      <div class="page-header">
        <div>
          <h1 class="page-title">Meus pedidos</h1>
          <p class="page-subtitle">As respostas aparecem aqui e chegam no e-mail da sua conta.</p>
        </div>
      </div>
      @if (loading()) {
        <div class="center"><p-progress-spinner strokeWidth="4" /></div>
      } @else if (error(); as message) {
        <div class="glass-card empty-state">
          <i class="pi pi-wifi"></i>
          <p>{{ message }}</p>
          <p-button label="Tentar de novo" severity="secondary" [outlined]="true" (onClick)="load()" />
        </div>
      } @else {
        <ul class="requests">
          @for (request of requests(); track request.id) {
            <li>
              <a class="glass-card request" [routerLink]="['/ajuda/pedidos', request.id]" [attr.data-request]="request.protocol">
                <span class="request-head">
                  <strong class="protocol">{{ request.protocol }}</strong>
                  <span class="status-chip" [class.answered]="request.status === 'waiting_user'">
                    @if (request.status === 'waiting_user') { <i class="pi pi-comment" aria-hidden="true"></i> }
                    {{ status[request.status] }}
                  </span>
                </span>
                <small class="muted">{{ category(request) }} · {{ request.createdAt | date: "d 'de' MMM, HH:mm" }}</small>
                <span class="message">{{ request.message }}</span>
              </a>
            </li>
          } @empty {
            <li class="glass-card empty-state">
              <i class="pi pi-inbox"></i>
              <p>Você ainda não mandou nenhum pedido.</p>
              <p-button label="Falar com o suporte" icon="pi pi-comments" routerLink="/ajuda/contato" />
            </li>
          }
        </ul>
      }
    </div>
  `,
  styles: `
    .requests { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: .75rem; }
    .request { padding: .85rem 1rem; display: flex; flex-direction: column; gap: .35rem; color: var(--bs-text); text-decoration: none; }
    .request-head { display: flex; justify-content: space-between; align-items: center; gap: .5rem; }
    .protocol { font-family: ui-monospace, monospace; letter-spacing: .05em; }
    .status-chip.answered { color: var(--bs-accent-light); font-weight: 600; }
    .message { margin: .25rem 0 0; white-space: pre-line; color: var(--bs-text-soft);
      display: -webkit-box; -webkit-line-clamp: 4; line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
    .center { display: flex; justify-content: center; }
  `,
})
export class SupportRequestsComponent {
  private readonly api = inject(SupportApi);

  readonly requests = signal<SupportRequest[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly status = SUPPORT_STATUS;

  constructor() {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.requests.set(await firstValueFrom(this.api.mine()));
    } catch (error) {
      this.error.set(problemMessage(error, 'Não foi possível carregar os pedidos.'));
    } finally {
      this.loading.set(false);
    }
  }

  category(request: SupportRequest): string {
    return SUPPORT_CATEGORIES.find((c) => c.value === request.category)?.label ?? request.category;
  }
}
