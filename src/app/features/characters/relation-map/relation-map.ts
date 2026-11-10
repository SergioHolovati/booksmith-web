import { Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { firstValueFrom } from 'rxjs';

import { ManuscriptApi } from '../../../core/api/manuscript.api';
import { problemMessage } from '../../../core/api/problem';
import { UniverseApi } from '../../../core/api/universe.api';
import { BookDetail, CharacterSummary, Relation } from '../../../core/models/api.models';
import { GROUP_COLOR, RELATION_KINDS, kindInfo, relationLayout } from '../relation-kinds';

/**
 * Mapa de relações (`/books/:bookId/relacoes`): os personagens num círculo e as relações entre eles, com a cor
 * do tipo (família, amor, amizade, dever, conflito). Tocar num personagem abre a ficha dele.
 */
@Component({
  selector: 'app-relation-map',
  imports: [RouterLink, ButtonModule, ProgressSpinnerModule],
  templateUrl: './relation-map.html',
  styleUrl: './relation-map.scss',
})
export class RelationMapComponent {
  private readonly manuscript = inject(ManuscriptApi);
  private readonly universe = inject(UniverseApi);

  readonly bookId = input.required<string>();

  readonly book = signal<BookDetail | null>(null);
  readonly characters = signal<CharacterSummary[]>([]);
  readonly relations = signal<Relation[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly nodes = computed(() => relationLayout(this.characters(), this.relations()));
  readonly edges = computed(() => {
    const at = new Map(this.nodes().map((n) => [n.id, n]));
    const seen = new Map<string, number>();
    return this.relations().flatMap((r) => {
      const a = at.get(r.from.id);
      const b = at.get(r.to.id);
      if (!a || !b) {
        return [];
      }
      // Mais de uma relação entre o mesmo par: cada uma curva um pouco mais, para não ficarem por cima
      const pair = [a.id, b.id].sort().join('|');
      const n = seen.get(pair) ?? 0;
      seen.set(pair, n + 1);
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const length = Math.hypot(dx, dy) || 1;
      const bend = n * 6 * (n % 2 === 0 ? 1 : -1);
      const cx = mx + (-dy / length) * bend;
      const cy = my + (dx / length) * bend;
      const info = kindInfo(r.kind);
      return [
        {
          id: r.id,
          path: `M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`,
          color: GROUP_COLOR[info.group],
          directed: r.directed,
          ended: r.until !== null,
          title: `${r.from.name} — ${info.forward} — ${r.to.name}` + (r.until ? ` (até "${r.until.name}")` : ''),
        },
      ];
    });
  });
  readonly loose = computed(() => {
    const placed = new Set(this.nodes().map((n) => n.id));
    return this.characters().filter((c) => !placed.has(c.id));
  });
  readonly legend = computed(() => {
    const used = new Set(this.relations().map((r) => kindInfo(r.kind).group));
    const labels: Record<string, string> = {
      family: 'Família',
      love: 'Amor',
      bond: 'Amizade e aliança',
      duty: 'Mentor e dever',
      conflict: 'Rivalidade e inimizade',
      other: 'Outras',
    };
    return [...new Set(RELATION_KINDS.map((k) => k.group))]
      .filter((g) => used.has(g))
      .map((g) => ({ label: labels[g], color: GROUP_COLOR[g] }));
  });

  constructor() {
    queueMicrotask(() => void this.load());
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const book = await firstValueFrom(this.manuscript.getBook(this.bookId()));
      this.book.set(book);
      const [characters, relations] = await Promise.all([
        firstValueFrom(this.universe.listCharacters(book.universeId)),
        firstValueFrom(this.universe.listRelations(book.universeId)),
      ]);
      this.characters.set(characters);
      this.relations.set(relations);
    } catch (error) {
      this.error.set(problemMessage(error, 'Não foi possível abrir o mapa de relações.'));
    } finally {
      this.loading.set(false);
    }
  }
}
