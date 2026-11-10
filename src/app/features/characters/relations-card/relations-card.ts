import { Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { firstValueFrom } from 'rxjs';

import { problemMessage } from '../../../core/api/problem';
import { UniverseApi } from '../../../core/api/universe.api';
import { CharacterSummary, Relation, RelationKind, TimelineEvent } from '../../../core/models/api.models';
import { GROUP_COLOR, RELATION_KINDS, describeFor, kindInfo } from '../relation-kinds';

/**
 * Relações do personagem, na ficha: "mãe de Lia", "rival de Kael". Criar escolhe o tipo, o outro personagem,
 * se a relação parte deste ou do outro (nos tipos com direção) e, opcionalmente, os eventos em que começou e
 * terminou. Tocar no lápis abre o mesmo formulário para editar.
 */
@Component({
  selector: 'app-relations-card',
  imports: [RouterLink, FormsModule, ButtonModule, InputTextModule, SelectModule],
  templateUrl: './relations-card.html',
  styleUrl: './relations-card.scss',
})
export class RelationsCardComponent {
  private readonly api = inject(UniverseApi);
  private readonly toast = inject(MessageService);

  readonly universeId = input.required<string>();
  readonly characterId = input.required<string>();
  readonly bookId = input.required<string>();

  readonly relations = signal<Relation[]>([]);
  readonly characters = signal<CharacterSummary[]>([]);
  readonly events = signal<TimelineEvent[]>([]);
  readonly adding = signal(false);
  readonly saving = signal(false);
  /** Relação aberta para editar; null = criando uma nova. */
  readonly editing = signal<Relation | null>(null);

  // Formulário de nova relação
  kind: RelationKind | null = null;
  otherId: string | null = null;
  /** Nos tipos com direção: este personagem é quem "é mãe de", "é mentor de", "serve a". */
  outgoing = true;
  description = '';
  sinceEventId: string | null = null;
  untilEventId: string | null = null;

  readonly kindOptions = RELATION_KINDS;
  readonly mine = computed(() =>
    this.relations()
      .filter((r) => r.from.id === this.characterId() || r.to.id === this.characterId())
      .map((r) => ({ relation: r, ...describeFor(r, this.characterId()), color: GROUP_COLOR[kindInfo(r.kind).group] })),
  );
  readonly others = computed(() =>
    this.characters()
      .filter((c) => c.id !== this.characterId())
      .map((c) => ({ value: c.id, label: c.name })),
  );
  readonly eventOptions = computed(() => this.events().map((e) => ({ value: e.id, label: e.dateLabel ? `${e.title} (${e.dateLabel})` : e.title })));

  constructor() {
    queueMicrotask(() => void this.load());
  }

  async load(): Promise<void> {
    try {
      const [relations, characters, events] = await Promise.all([
        firstValueFrom(this.api.listRelations(this.universeId())),
        firstValueFrom(this.api.listCharacters(this.universeId())),
        firstValueFrom(this.api.timeline(this.universeId())),
      ]);
      this.relations.set(relations);
      this.characters.set(characters);
      this.events.set(events);
    } catch {
      this.relations.set([]); // a ficha funciona sem as relações
    }
  }

  directed(): boolean {
    return this.kind ? (kindInfo(this.kind).forward !== kindInfo(this.kind).backward) : false;
  }

  /** "Lia é mãe de…" ou "…é mãe de Lia", conforme a direção escolhida. */
  directionOptions(): { value: boolean; label: string }[] {
    if (!this.kind) {
      return [];
    }
    const info = kindInfo(this.kind);
    return [
      { value: true, label: `Este é ${info.forward}…` },
      { value: false, label: `Este é ${info.backward}…` },
    ];
  }

  /** Abre o formulário: vazio para uma relação nova ou preenchido com a relação escolhida. */
  open(relation: Relation | null = null): void {
    const outgoing = !relation || relation.from.id === this.characterId();
    this.editing.set(relation);
    this.kind = relation?.kind ?? null;
    this.otherId = relation ? (outgoing ? relation.to.id : relation.from.id) : null;
    this.outgoing = outgoing;
    this.description = relation?.description ?? '';
    this.sinceEventId = relation?.since?.id ?? null;
    this.untilEventId = relation?.until?.id ?? null;
    this.adding.set(true);
  }

  close(): void {
    this.adding.set(false);
    this.editing.set(null);
  }

  async save(): Promise<void> {
    if (!this.kind || !this.otherId) {
      return;
    }
    const outgoing = this.directed() ? this.outgoing : true;
    const request = {
      fromId: outgoing ? this.characterId() : this.otherId,
      toId: outgoing ? this.otherId : this.characterId(),
      kind: this.kind,
      description: this.description.trim() || null,
      sinceEventId: this.sinceEventId,
      untilEventId: this.untilEventId,
    };
    const editing = this.editing();
    this.saving.set(true);
    try {
      await firstValueFrom(
        editing
          ? this.api.updateRelation(editing.id, { ...request, version: editing.version })
          : this.api.createRelation(this.universeId(), request),
      );
      this.close();
      await this.load();
    } catch (error) {
      const fallback = editing ? 'Não foi possível salvar a relação.' : 'Não foi possível criar a relação.';
      this.toast.add({ severity: 'error', summary: problemMessage(error, fallback) });
    } finally {
      this.saving.set(false);
    }
  }

  async remove(relation: Relation): Promise<void> {
    try {
      await firstValueFrom(this.api.deleteRelation(relation.id));
      this.relations.update((list) => list.filter((r) => r.id !== relation.id));
      if (this.editing()?.id === relation.id) {
        this.close();
      }
      this.toast.add({ severity: 'success', summary: 'Relação na lixeira por 30 dias', life: 3000 });
    } catch (error) {
      this.toast.add({ severity: 'error', summary: problemMessage(error) });
    }
  }
}
