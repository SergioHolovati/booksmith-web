import { Component, computed, inject, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { firstValueFrom } from 'rxjs';

import { problemMessage } from '../../../core/api/problem';
import { UniverseApi } from '../../../core/api/universe.api';
import { PlaceSummary, UniverseDetail } from '../../../core/models/api.models';
import { MapPlaceDraft, mapPlaces, selectedBatch } from '../map-generator/map-places';
import { World, generateWorld } from '../map-generator/world';
import { generateLore } from '../map-generator/world-lore';

/**
 * Cartão "Lugares" do passo Mapa: refaz o mundo pela semente salva, lista o que ele tem (países, cidades,
 * florestas, serras, mar) para escolher, e cria os escolhidos como lugares do universo, com posição no mapa.
 */
@Component({
  selector: 'app-map-places-card',
  imports: [RouterLink, ButtonModule],
  templateUrl: './map-places-card.html',
  styleUrl: './map-places-card.scss',
})
export class MapPlacesCardComponent {
  private readonly api = inject(UniverseApi);
  private readonly toast = inject(MessageService);

  readonly universe = input.required<UniverseDetail>();
  readonly places = input.required<PlaceSummary[]>();
  /** O mapa atual foi gerado no app (as posições batem com a imagem). */
  readonly generated = input(false);
  readonly pinCount = input(0);
  /** Lugares criados: o construtor recarrega a lista e os pontos. */
  readonly imported = output<void>();

  readonly drafts = signal<MapPlaceDraft[] | null>(null);
  readonly chosen = signal<ReadonlySet<string>>(new Set());
  readonly importing = signal(false);
  /** Criar também religiões, governos, idiomas e organizações do mundo gerado. */
  readonly withLore = signal(true);
  private world: World | null = null;
  private readonly existingNames = computed(() => new Set(this.places().map((p) => p.name.trim().toLowerCase())));
  readonly groups = computed(() => {
    const groups = new Map<string, MapPlaceDraft[]>();
    for (const draft of this.drafts() ?? []) {
      groups.set(draft.group, [...(groups.get(draft.group) ?? []), draft]);
    }
    return [...groups.entries()].map(([name, items]) => ({ name, items }));
  });
  readonly newChosen = computed(
    () => (this.drafts() ?? []).filter((d) => this.chosen().has(d.key) && !this.exists(d)).length,
  );

  /** Sem lugar novo para criar, o botão ainda serve para gerar só o contexto do mundo. */
  readonly createLabel = computed(() => {
    const count = this.newChosen();
    if (count === 0) {
      return 'Criar religiões, governos e idiomas';
    }
    return count === 1 ? 'Criar 1 lugar' : `Criar ${count} lugares`;
  });

  exists(draft: MapPlaceDraft): boolean {
    return this.existingNames().has(draft.name.trim().toLowerCase());
  }

  /** Lista o que o mapa tem; tudo vem marcado, menos o que já existe no universo. */
  open(): void {
    const settings = this.universe().mapGenerator;
    if (!settings) {
      return;
    }
    this.world = generateWorld(settings);
    const drafts = mapPlaces(this.world);
    this.drafts.set(drafts);
    this.chosen.set(new Set(drafts.filter((d) => !this.exists(d)).map((d) => d.key)));
  }

  close(): void {
    this.drafts.set(null);
  }

  toggle(draft: MapPlaceDraft): void {
    this.chosen.update((chosen) => {
      const next = new Set(chosen);
      if (next.has(draft.key)) {
        next.delete(draft.key);
      } else {
        next.add(draft.key);
      }
      return next;
    });
  }

  /** Tocar no nome do grupo marca ou desmarca o grupo inteiro. */
  toggleGroup(items: MapPlaceDraft[]): void {
    const all = items.filter((d) => !this.exists(d)).every((d) => this.chosen().has(d.key));
    this.chosen.update((chosen) => {
      const next = new Set(chosen);
      for (const d of items) {
        if (all) {
          next.delete(d.key);
        } else if (!this.exists(d)) {
          next.add(d.key);
        }
      }
      return next;
    });
  }

  async create(): Promise<void> {
    const drafts = this.drafts();
    if (!drafts) {
      return;
    }
    this.importing.set(true);
    try {
      const result = await firstValueFrom(
        this.api.importMapPlaces(this.universe().id, selectedBatch(drafts, this.chosen())),
      );
      const details: string[] = [];
      if (this.withLore() && this.world) {
        const lore = await firstValueFrom(this.api.importLore(this.universe().id, generateLore(this.world)));
        if (lore.created > 0) {
          details.push(`Mais ${lore.created} religiões, governos, idiomas e organizações.`);
        }
      }
      if (result.skipped.length) {
        details.push(`${result.skipped.length} já existiam e ficaram como estavam.`);
      }
      this.toast.add({
        severity: 'success',
        summary:
          result.created === 0
            ? 'Nada novo nos lugares'
            : result.created === 1
              ? '1 lugar criado'
              : `${result.created} lugares criados`,
        detail: details.join(' ') || undefined,
        life: 5000,
      });
      this.drafts.set(null);
      this.imported.emit();
    } catch (error) {
      this.toast.add({ severity: 'error', summary: problemMessage(error, 'Não foi possível criar os lugares.') });
    } finally {
      this.importing.set(false);
    }
  }
}
