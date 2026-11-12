import { Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { firstValueFrom } from 'rxjs';

import { AssistApi } from '../../../core/api/assist.api';
import { problemMessage } from '../../../core/api/problem';
import { BookTextItem } from '../../../core/models/api.models';

/** O nome de cada tipo de apontamento na tela. */
export const KIND_LABELS: Partial<Record<string, string>> = {
  name: 'Nome diferente da história',
  spelling: 'Ortografia',
  grammar: 'Gramática',
  format: 'Formatação',
  fact: 'Diverge da história (IA)',
};

export interface TextGroup {
  label: string;
  /** Onde se edita esse texto. */
  link: string[];
  items: BookTextItem[];
}

/**
 * "Revisar textos do livro" na página do livro: a sinopse, o "Sobre o autor" e as fichas dos personagens,
 * comparados com a história. Sem IA (livre): ortografia, formatação e nomes que divergem ("Sergio" × "Sérgio").
 * Com IA (1 uso): fatos que divergem (a sinopse diz 6 meses, a história diz 5). Só aponta; cada grupo leva à tela
 * onde aquele texto é editado.
 */
@Component({
  selector: 'app-book-texts',
  imports: [RouterLink, ButtonModule],
  templateUrl: './book-texts.html',
  styleUrl: './book-texts.scss',
})
export class BookTextsComponent {
  private readonly api = inject(AssistApi);

  readonly bookId = input.required<string>();

  readonly kindLabels = KIND_LABELS;
  readonly open = signal(false);
  readonly loading = signal<'free' | 'ai' | null>(null);
  readonly error = signal<string | null>(null);
  readonly freeItems = signal<BookTextItem[] | null>(null);
  readonly aiItems = signal<BookTextItem[] | null>(null);
  readonly texts = signal(0);
  readonly status = this.api.status;
  readonly aiEnabled = computed(() => this.status()?.enabled === true);
  readonly remaining = computed(() => this.status()?.remaining ?? 0);
  readonly groups = computed(() => groupItems([...(this.freeItems() ?? []), ...(this.aiItems() ?? [])], this.bookId()));
  readonly checked = computed(() => this.freeItems() !== null || this.aiItems() !== null);

  constructor() {
    void this.api.ensureStatus();
  }

  async checkFree(): Promise<void> {
    await this.run('free', async () => {
      const result = await firstValueFrom(this.api.checkBookTexts(this.bookId()));
      this.texts.set(result.texts);
      this.freeItems.set(result.items);
    });
  }

  async compareAi(): Promise<void> {
    await this.run('ai', async () => {
      const result = await firstValueFrom(this.api.compareBookTexts(this.bookId()));
      this.texts.set(result.texts);
      this.aiItems.set(result.items);
    });
  }

  private async run(kind: 'free' | 'ai', call: () => Promise<void>): Promise<void> {
    if (this.loading()) {
      return;
    }
    this.loading.set(kind);
    this.error.set(null);
    try {
      await call();
    } catch (error) {
      this.error.set(problemMessage(error, 'Não foi possível revisar os textos agora.'));
    } finally {
      this.loading.set(null);
    }
  }
}

/** Agrupa por texto (na ordem: sinopse, sobre o autor, fichas), com o caminho da tela onde ele é editado. */
export function groupItems(items: BookTextItem[], bookId: string): TextGroup[] {
  const groups = new Map<string, TextGroup>();
  for (const item of items) {
    let group = groups.get(item.label);
    if (!group) {
      group = { label: item.label, link: editLink(item, bookId), items: [] };
      groups.set(item.label, group);
    }
    group.items.push(item);
  }
  const order = (g: TextGroup) => (g.label === 'Sinopse' ? 0 : g.label === 'Sobre o autor' ? 1 : 2);
  return [...groups.values()].sort((a, b) => order(a) - order(b));
}

function editLink(item: BookTextItem, bookId: string): string[] {
  switch (item.source) {
    case 'synopsis':
      return ['/books', bookId, 'edit'];
    case 'about':
      return ['/books', bookId, 'paginas'];
    default:
      return ['/books', bookId, 'characters', item.id ?? ''];
  }
}
