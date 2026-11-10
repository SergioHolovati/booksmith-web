import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { firstValueFrom } from 'rxjs';

import { ManuscriptApi } from '../../core/api/manuscript.api';
import { UniverseApi } from '../../core/api/universe.api';
import { problemMessage } from '../../core/api/problem';
import { TrashItem, UniverseTrashItem } from '../../core/models/api.models';
import { formatCount } from '../../core/util/word-count';

/** Rótulo e ícone de cada tipo de item do universo na lixeira. */
export const UNIVERSE_TRASH_KIND: Record<UniverseTrashItem['type'], { label: string; icon: string; restored: string }> = {
  CHARACTER: { label: 'Personagem', icon: 'pi-user', restored: 'Personagem restaurado' },
  PLACE: { label: 'Lugar', icon: 'pi-map-marker', restored: 'Lugar restaurado' },
  LORE: { label: 'Ficha do mundo', icon: 'pi-sun', restored: 'Ficha restaurada' },
  EVENT: { label: 'Evento da linha do tempo', icon: 'pi-clock', restored: 'Evento restaurado' },
  RELATION: { label: 'Relação', icon: 'pi-share-alt', restored: 'Relação restaurada' },
  IMAGE: { label: 'Imagem', icon: 'pi-image', restored: 'Imagem restaurada' },
};

type AnyItem = { kind: 'book'; item: TrashItem } | { kind: 'universe'; item: UniverseTrashItem };

/** Tudo o que foi excluído nos últimos 30 dias, mais recente primeiro (livros, capítulos e o universo). */
export function mergeTrash(books: TrashItem[], universe: UniverseTrashItem[]): AnyItem[] {
  return [
    ...books.map((item) => ({ kind: 'book' as const, item })),
    ...universe.map((item) => ({ kind: 'universe' as const, item })),
  ].sort((a, b) => b.item.deletedAt.localeCompare(a.item.deletedAt));
}

/** Livros, capítulos, personagens, lugares, eventos e o resto do universo, por 30 dias: voltam com um toque. */
@Component({
  selector: 'app-trash',
  imports: [RouterLink, ButtonModule, ProgressSpinnerModule],
  templateUrl: './trash.html',
  styleUrl: './trash.scss',
})
export class TrashComponent {
  private readonly api = inject(ManuscriptApi);
  private readonly toast = inject(MessageService);
  private readonly universe = inject(UniverseApi);

  readonly items = signal<AnyItem[]>([]);
  readonly universeKind = UNIVERSE_TRASH_KIND;
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
      const [books, universe] = await Promise.all([
        firstValueFrom(this.api.listTrash()),
        firstValueFrom(this.universe.listUniverseTrash()),
      ]);
      this.items.set(mergeTrash(books, universe));
    } catch (error) {
      this.error.set(problemMessage(error, 'Não foi possível abrir a lixeira.'));
    } finally {
      this.loading.set(false);
    }
  }

  async restoreUniverse(item: UniverseTrashItem): Promise<void> {
    this.restoring.set(item.id);
    try {
      await firstValueFrom(this.universe.restoreUniverseItem(item));
      this.items.update((items) => items.filter((i) => i.item.id !== item.id));
      this.toast.add({ severity: 'success', summary: UNIVERSE_TRASH_KIND[item.type].restored, life: 3000 });
    } catch (error) {
      this.toast.add({ severity: 'error', summary: problemMessage(error), life: 6000 });
    } finally {
      this.restoring.set(null);
    }
  }

  async restore(item: TrashItem): Promise<void> {
    this.restoring.set(item.id);
    try {
      await firstValueFrom(this.api.restoreFromTrash(item));
      this.items.update((items) => items.filter((i) => i.item.id !== item.id));
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

  daysLeft(item: { expiresAt: string }): number {
    return Math.max(0, Math.ceil((new Date(item.expiresAt).getTime() - Date.now()) / 86_400_000));
  }

  deletedOn(item: { deletedAt: string }): string {
    return new Date(item.deletedAt).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
  }
}
