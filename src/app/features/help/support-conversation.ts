import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TextareaModule } from 'primeng/textarea';
import { firstValueFrom } from 'rxjs';

import { problemMessage } from '../../core/api/problem';
import { SupportApi } from '../../core/api/support.api';
import { SupportConversation } from '../../core/models/api.models';
import { SUPPORT_STATUS } from './support-requests';
import { SUPPORT_CATEGORIES } from './support-form';

/** A conversa em ordem: o que a pessoa mandou primeiro e as mensagens depois. */
export function conversationLines(conversation: SupportConversation): {
  key: string;
  mine: boolean;
  body: string;
  createdAt: string;
}[] {
  return [
    { key: 'first', mine: true, body: conversation.request.message, createdAt: conversation.request.createdAt },
    ...conversation.messages.map((m) => ({ key: m.id, mine: m.author === 'user', body: m.body, createdAt: m.createdAt })),
  ];
}

/** Um pedido (`/ajuda/pedidos/:id`): a conversa com a equipe e a resposta da pessoa. */
@Component({
  selector: 'app-support-conversation',
  imports: [DatePipe, FormsModule, RouterLink, ButtonModule, ProgressSpinnerModule, TextareaModule],
  template: `
    <div class="page narrow">
      <a routerLink="/ajuda/pedidos" class="back-link"><i class="pi pi-arrow-left"></i> Meus pedidos</a>
      @if (conversation(); as c) {
        <div class="page-header">
          <div>
            <h1 class="page-title protocol" data-protocol>{{ c.request.protocol }}</h1>
            <p class="page-subtitle">{{ category() }} · {{ status[c.request.status] }}</p>
          </div>
        </div>

        <div class="lines">
          @for (line of lines(); track line.key) {
            <article class="line glass-card" [class.team]="!line.mine" [attr.data-message]="line.mine ? 'mine' : 'team'">
              <header class="small muted">
                <strong>{{ line.mine ? 'Você' : 'Equipe do Booksmith' }}</strong> ·
                {{ line.createdAt | date: "d 'de' MMM, HH:mm" }}
              </header>
              <p class="body">{{ line.body }}</p>
            </article>
          }
        </div>

        <form class="reply" (ngSubmit)="send()" data-reply-form>
          <label for="reply" class="small muted">
            {{ c.request.status === 'resolved' ? 'Ainda precisa de ajuda? Responda e o pedido volta para a equipe.' : 'Responder' }}
          </label>
          <textarea id="reply" name="body" pTextarea rows="4" maxlength="5000" [(ngModel)]="body"></textarea>
          <p-button type="submit" label="Enviar" icon="pi pi-send" [loading]="sending()" [disabled]="!body.trim()" />
        </form>
      } @else if (error(); as message) {
        <p class="muted">{{ message }}</p>
      } @else {
        <div class="center"><p-progress-spinner strokeWidth="4" /></div>
      }
    </div>
  `,
  styles: `
    .protocol { font-family: ui-monospace, monospace; letter-spacing: .05em; }
    .lines { display: flex; flex-direction: column; gap: .6rem; }
    .line { padding: .75rem .9rem; max-width: 92%; }
    .line.team { align-self: flex-end; border-color: color-mix(in srgb, var(--bs-ember) 45%, var(--bs-border)); }
    .body { margin: .3rem 0 0; white-space: pre-wrap; overflow-wrap: anywhere; }
    .reply { display: flex; flex-direction: column; gap: .5rem; margin-top: 1rem; }
    .reply textarea { width: 100%; resize: vertical; }
    .reply p-button { align-self: flex-end; }
    .center { display: flex; justify-content: center; }
  `,
})
export class SupportConversationComponent {
  private readonly api = inject(SupportApi);
  private readonly toast = inject(MessageService);

  readonly id = input.required<string>();
  readonly conversation = signal<SupportConversation | null>(null);
  readonly error = signal<string | null>(null);
  readonly sending = signal(false);
  readonly status = SUPPORT_STATUS;
  readonly lines = computed(() => {
    const c = this.conversation();
    return c ? conversationLines(c) : [];
  });
  readonly category = computed(() => {
    const value = this.conversation()?.request.category;
    return SUPPORT_CATEGORIES.find((c) => c.value === value)?.label ?? value ?? '';
  });

  body = '';

  constructor() {
    queueMicrotask(() => void this.load());
  }

  async load(): Promise<void> {
    try {
      this.conversation.set(await firstValueFrom(this.api.conversation(this.id())));
    } catch (error) {
      this.error.set(problemMessage(error, 'Não foi possível abrir o pedido.'));
    }
  }

  async send(): Promise<void> {
    const text = this.body.trim();
    if (!text) {
      return;
    }
    this.sending.set(true);
    try {
      this.conversation.set(await firstValueFrom(this.api.reply(this.id(), text)));
      this.body = '';
      this.toast.add({ severity: 'success', summary: 'Mensagem enviada', detail: 'A equipe responde por aqui e no seu e-mail.', life: 3000 });
    } catch (error) {
      this.toast.add({ severity: 'error', summary: problemMessage(error), life: 5000 });
    } finally {
      this.sending.set(false);
    }
  }
}
