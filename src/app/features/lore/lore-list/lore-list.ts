import { Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { firstValueFrom } from 'rxjs';

import { problemMessage } from '../../../core/api/problem';
import { UniverseApi } from '../../../core/api/universe.api';
import { LoreDefinition, LoreSummary, LoreType, UniverseDetail } from '../../../core/models/api.models';

export const LORE_TYPES: LoreType[] = ['religion', 'government', 'language', 'organization', 'creature', 'object', 'term'];

/**
 * Contexto do mundo (`/universes/:id/mundo`): religiões, governos, idiomas, organizações, criaturas, objetos e termos, cada um
 * com os lugares onde está presente. Abas por tipo; `?tipo=` abre direto numa delas.
 */
@Component({
  selector: 'app-lore-list',
  imports: [RouterLink, FormsModule, ButtonModule, InputTextModule, ProgressSpinnerModule],
  templateUrl: './lore-list.html',
  styleUrl: './lore-list.scss',
})
export class LoreListComponent {
  private readonly api = inject(UniverseApi);
  private readonly router = inject(Router);
  private readonly toast = inject(MessageService);

  readonly universeId = input.required<string>();
  readonly tipo = input<string>();

  readonly universe = signal<UniverseDetail | null>(null);
  readonly definition = signal<LoreDefinition | null>(null);
  readonly items = signal<LoreSummary[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly creating = signal(false);
  readonly selected = signal<LoreType>('religion');
  readonly types = LORE_TYPES;
  newName = '';

  readonly current = computed(() => this.definition()?.types[this.selected()] ?? null);
  readonly visible = computed(() => this.items().filter((i) => i.type === this.selected()));
  readonly counts = computed(() =>
    Object.fromEntries(LORE_TYPES.map((t) => [t, this.items().filter((i) => i.type === t).length])),
  );

  constructor() {
    queueMicrotask(() => {
      const wanted = this.tipo();
      if (wanted && (LORE_TYPES as string[]).includes(wanted)) {
        this.selected.set(wanted as LoreType);
      }
      void this.load();
    });
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const [universe, definition, items] = await Promise.all([
        firstValueFrom(this.api.getUniverse(this.universeId())),
        firstValueFrom(this.api.loreForm()),
        firstValueFrom(this.api.listLore(this.universeId())),
      ]);
      this.universe.set(universe);
      this.definition.set(definition);
      this.items.set(items);
    } catch (error) {
      this.error.set(problemMessage(error, 'Não foi possível carregar o mundo.'));
    } finally {
      this.loading.set(false);
    }
  }

  select(type: LoreType): void {
    this.selected.set(type);
    void this.router.navigate([], { queryParams: { tipo: type }, replaceUrl: true });
  }

  async create(): Promise<void> {
    const name = this.newName.trim();
    if (!name) {
      return;
    }
    this.creating.set(true);
    try {
      const item = await firstValueFrom(this.api.createLore(this.universeId(), this.selected(), name));
      this.newName = '';
      await this.router.navigate(['/universes', this.universeId(), 'mundo', item.id]);
    } catch (error) {
      this.toast.add({ severity: 'error', summary: problemMessage(error) });
    } finally {
      this.creating.set(false);
    }
  }
}
