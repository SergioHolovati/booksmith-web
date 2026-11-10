import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { TextareaModule } from 'primeng/textarea';
import { firstValueFrom } from 'rxjs';

import { problemMessage } from '../../core/api/problem';
import { SupportApi } from '../../core/api/support.api';
import { SupportCategory, SupportContext, SupportRequest } from '../../core/models/api.models';
import { APP_VERSION, ErrorTrail } from '../../core/support/error-trail';

export const SUPPORT_CATEGORIES: { value: SupportCategory; label: string }[] = [
  { value: 'lost_text', label: 'Meu texto sumiu' },
  { value: 'bug', label: 'Algo não funciona' },
  { value: 'account', label: 'Conta e login' },
  { value: 'import_export', label: 'Importar ou baixar livro' },
  { value: 'universe', label: 'Universo, personagens e imagens' },
  { value: 'suggestion', label: 'Sugestão' },
  { value: 'privacy', label: 'Privacidade e dados' },
  { value: 'other', label: 'Outro assunto' },
];

/** Capítulo aberto, se a pessoa veio do editor (`/books/:id/chapters/:chapterId`). */
export function chapterFromRoute(route: string): string | null {
  return /\/chapters\/([0-9a-f-]{36})(?:$|\/)/.exec(route)?.[1] ?? null;
}

/**
 * "Falar com o suporte" (`/ajuda/contato`): assunto, mensagem e o contexto técnico, que a pessoa vê antes de
 * enviar. Nunca vai o texto do livro.
 */
@Component({
  selector: 'app-support-form',
  imports: [FormsModule, RouterLink, ButtonModule, TextareaModule],
  templateUrl: './support-form.html',
  styleUrl: './support-form.scss',
})
export class SupportFormComponent {
  private readonly api = inject(SupportApi);
  private readonly trail = inject(ErrorTrail);
  private readonly toast = inject(MessageService);

  readonly categories = SUPPORT_CATEGORIES;
  readonly category = signal<SupportCategory | null>(null);
  readonly message = signal('');
  readonly sending = signal(false);
  readonly sent = signal<SupportRequest | null>(null);

  readonly context = computed<SupportContext>(() => {
    const route = this.trail.route();
    return {
      route,
      appVersion: APP_VERSION,
      userAgent: navigator.userAgent,
      online: navigator.onLine,
      screen: `${window.innerWidth}x${window.innerHeight}`,
      language: navigator.language,
      traceIds: this.trail.recentTraces(),
      chapterId: chapterFromRoute(route),
      autosaveStatus: null,
    };
  });
  readonly canSend = computed(() => !!this.category() && this.message().trim().length >= 10);

  async send(): Promise<void> {
    const category = this.category();
    if (!category || !this.canSend()) {
      return;
    }
    this.sending.set(true);
    try {
      this.sent.set(await firstValueFrom(this.api.create(category, this.message().trim(), this.context())));
    } catch (error) {
      this.toast.add({ severity: 'error', summary: problemMessage(error, 'Não foi possível enviar o pedido.'), life: 6000 });
    } finally {
      this.sending.set(false);
    }
  }
}
