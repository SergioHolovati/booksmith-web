import { Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { firstValueFrom } from 'rxjs';

import { AssistApi } from '../../../core/api/assist.api';
import { problemMessage } from '../../../core/api/problem';
import { AskResult } from '../../../core/models/api.models';

/** Exemplos para quem não sabe o que perguntar; tocar preenche a caixa. */
export const ASK_EXAMPLES = [
  'Quem já sabe do segredo?',
  'Quantos anos ela tem nesta parte da história?',
  'Onde estava cada personagem no último capítulo?',
];

export const MAX_QUESTION = 500;
const MAX_HISTORY = 5;

export interface AskEntry {
  question: string;
  result: AskResult | null;
  error: string | null;
}

/**
 * "Pergunte ao seu livro" (§4.5) na página do livro: o autor pergunta e a IA responde com o que está no texto e
 * nas fichas, mostrando os trechos de origem. Tocar num trecho abre o editor no parágrafo. As últimas perguntas
 * ficam na tela (só nesta visita; nada é guardado).
 */
@Component({
  selector: 'app-ask-book',
  imports: [FormsModule, RouterLink, ButtonModule],
  templateUrl: './ask-book.html',
  styleUrl: './ask-book.scss',
})
export class AskBookComponent {
  private readonly api = inject(AssistApi);

  readonly bookId = input.required<string>();

  readonly examples = ASK_EXAMPLES;
  readonly maxQuestion = MAX_QUESTION;
  readonly open = signal(false);
  readonly question = signal('');
  readonly loading = signal(false);
  readonly history = signal<AskEntry[]>([]);
  readonly status = this.api.status;
  readonly enabled = computed(() => this.status()?.enabled === true);
  readonly canAsk = computed(
    () => !this.loading() && this.question().trim().length > 0 && this.status()?.remaining !== 0,
  );

  constructor() {
    void this.api.ensureStatus();
  }

  useExample(example: string): void {
    this.question.set(example);
  }

  /** Enter pergunta; Shift+Enter quebra a linha. */
  onKey(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void this.ask();
    }
  }

  async ask(): Promise<void> {
    const question = this.question().trim();
    if (!question || this.loading()) {
      return;
    }
    this.loading.set(true);
    let entry: AskEntry;
    try {
      const result = await firstValueFrom(this.api.ask({ bookId: this.bookId(), question }));
      entry = { question, result, error: null };
      this.question.set('');
    } catch (error) {
      entry = { question, result: null, error: problemMessage(error, 'Não foi possível responder agora.') };
    } finally {
      this.loading.set(false);
    }
    this.history.update((list) => [entry, ...list].slice(0, MAX_HISTORY));
  }

  chapterLabel(chapter: number, title: string | null): string {
    return title ? `Cap. ${chapter} · ${title}` : `Capítulo ${chapter}`;
  }
}
