import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { firstValueFrom } from 'rxjs';

import { ManuscriptApi } from '../../core/api/manuscript.api';
import { problemMessage } from '../../core/api/problem';
import { TrashItem } from '../../core/models/api.models';
import { formatCount } from '../../core/util/word-count';

/** Livros e capítulos excluídos nos últimos 30 dias: voltam com um toque. */
@Component({
  selector: 'app-trash',
  imports: [RouterLink, ButtonModule, ProgressSpinnerModule],
  templateUrl: './trash.html',
  styleUrl: './trash.scss',
})
export class TrashComponent {
  private readonly api = inject(ManuscriptApi);
  private readonly toast = inject(MessageService);

  readonly items = signal<TrashItem[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly restoring = signal<string | null>(null);
  readonly formatCount = formatCount;

  constructor() {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.items.set(await firstValueFrom(this.api.listTrash()));
    } catch (error) {
      this.error.set(problemMessage(error, 'Não foi possível abrir a lixeira.'));
    } finally {
      this.loading.set(false);
    }
  }

  async restore(item: TrashItem): Promise<void> {
    this.restoring.set(item.id);
    try {
      await firstValueFrom(this.api.restoreFromTrash(item));
      this.items.update((items) => items.filter((i) => i.id !== item.id));
      this.toast.add({
        severity: 'success',
        summary: item.type === 'BOOK' ? 'Livro restaurado' : 'Capítulo restaurado',
        detail: item.type === 'CHAPTER' ? `Voltou para o fim de "${item.bookTitle}".` : undefined,
        life: 3500,
      });
    } catch (error) {
      this.toast.add({ severity: 'error', summary: problemMessage(error) });
    } finally {
      this.restoring.set(null);
    }
  }

  daysLeft(item: TrashItem): number {
    return Math.max(0, Math.ceil((new Date(item.expiresAt).getTime() - Date.now()) / 86_400_000));
  }

  deletedOn(item: TrashItem): string {
    return new Date(item.deletedAt).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
  }
}
