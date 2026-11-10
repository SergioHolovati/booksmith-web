import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { firstValueFrom } from 'rxjs';

import { problemMessage } from '../../core/api/problem';
import { WritingApi } from '../../core/api/writing.api';
import { WritingDay, WritingStats } from '../../core/models/api.models';
import { formatCount } from '../../core/util/word-count';

/** Dias no gráfico do cartão. */
export const CHART_DAYS = 14;
export const GOAL_PRESETS = [250, 500, 1000, 2000];

const WEEKDAY = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });

/** "2026-11-10" → "ter., 10 de nov." (a data vem sem hora: lida em UTC para não andar um dia). */
export function dayLabel(day: string): string {
  return WEEKDAY.format(new Date(`${day}T00:00:00Z`));
}

/** Altura de cada barra (0 a 100) numa escala que sempre mostra a meta. */
export function barHeights(days: WritingDay[], goal: number | null): { max: number; heights: number[] } {
  const max = Math.max(goal ?? 0, ...days.map((d) => d.words), 1);
  return { max, heights: days.map((d) => (d.words / max) * 100) };
}

/**
 * Meta diária no Início: palavras de hoje, a sequência de dias e as duas últimas semanas. Sem meta, convida a
 * definir uma (é opcional; a sequência conta qualquer dia com escrita).
 */
@Component({
  selector: 'app-writing-goal-card',
  imports: [FormsModule, ButtonModule, InputNumberModule],
  templateUrl: './writing-goal-card.html',
  styleUrl: './writing-goal-card.scss',
})
export class WritingGoalCardComponent {
  private readonly api = inject(WritingApi);
  private readonly toast = inject(MessageService);

  readonly stats = signal<WritingStats | null>(null);
  readonly editing = signal(false);
  readonly saving = signal(false);
  readonly selected = signal<number | null>(null);
  readonly presets = GOAL_PRESETS;
  goalInput: number | null = null;

  readonly days = computed(() => this.stats()?.history.slice(-CHART_DAYS) ?? []);
  readonly chart = computed(() => barHeights(this.days(), this.stats()?.goal ?? null));
  readonly goalLine = computed(() => {
    const goal = this.stats()?.goal;
    return goal ? (goal / this.chart().max) * 100 : null;
  });
  readonly progress = computed(() => {
    const stats = this.stats();
    return stats?.goal ? Math.min(100, (stats.today / stats.goal) * 100) : 0;
  });
  readonly selectedDay = computed(() => {
    const index = this.selected();
    return index === null ? null : (this.days()[index] ?? null);
  });
  readonly formatCount = formatCount;
  readonly dayLabel = dayLabel;

  constructor() {
    void this.load();
  }

  async load(): Promise<void> {
    try {
      this.stats.set(await firstValueFrom(this.api.stats()));
    } catch {
      this.stats.set(null); // o Início funciona sem o cartão
    }
  }

  startEditing(): void {
    this.goalInput = this.stats()?.goal ?? 500;
    this.editing.set(true);
  }

  async saveGoal(goal: number | null): Promise<void> {
    this.saving.set(true);
    try {
      await firstValueFrom(this.api.setGoal(goal));
      this.editing.set(false);
      await this.load();
      this.toast.add({
        severity: 'success',
        summary: goal ? `Meta: ${formatCount(goal)} palavras por dia` : 'Meta removida',
        life: 3000,
      });
    } catch (error) {
      this.toast.add({ severity: 'error', summary: problemMessage(error), life: 5000 });
    } finally {
      this.saving.set(false);
    }
  }

  reached(day: WritingDay): boolean {
    const goal = this.stats()?.goal;
    return goal ? day.words >= goal : day.words > 0;
  }

  select(index: number): void {
    this.selected.set(this.selected() === index ? null : index);
  }
}
