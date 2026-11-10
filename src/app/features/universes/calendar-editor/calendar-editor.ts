import { Component, HostListener, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { firstValueFrom } from 'rxjs';

import { problemMessage } from '../../../core/api/problem';
import { UniverseApi } from '../../../core/api/universe.api';
import { CalendarEra, UniverseDetail, WorldCalendar } from '../../../core/models/api.models';
import { HasUnsavedChanges } from '../../../core/util/unsaved-changes.guard';
import { stableJson } from '../../characters/appearance-values';

const OUR_MONTHS = [
  ['janeiro', 31], ['fevereiro', 28], ['março', 31], ['abril', 30], ['maio', 31], ['junho', 30],
  ['julho', 31], ['agosto', 31], ['setembro', 30], ['outubro', 31], ['novembro', 30], ['dezembro', 31],
] as const;

/** Pontos de partida: o autor escolhe um e ajusta nomes e tamanhos. */
export const CALENDAR_PRESETS: { label: string; calendar: () => WorldCalendar }[] = [
  {
    label: 'Nosso calendário',
    calendar: () => ({
      eras: [{ key: 'e1', name: '', abbreviation: '', years: null }],
      months: OUR_MONTHS.map(([name, days]) => ({ name, days })),
      weekdays: ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'],
    }),
  },
  {
    label: '12 meses de 30 dias',
    calendar: () => ({
      eras: [{ key: 'e1', name: 'Era Atual', abbreviation: 'E.A.', years: null }],
      months: Array.from({ length: 12 }, (_, i) => ({ name: `Mês ${i + 1}`, days: 30 })),
      weekdays: [],
    }),
  },
  {
    label: '13 luas de 28 dias',
    calendar: () => ({
      eras: [{ key: 'e1', name: 'Era Atual', abbreviation: 'E.A.', years: null }],
      months: Array.from({ length: 13 }, (_, i) => ({ name: `Lua ${i + 1}`, days: 28 })),
      weekdays: ['Primeiro', 'Segundo', 'Terceiro', 'Quarto', 'Quinto', 'Sexto', 'Sétimo'],
    }),
  },
];

/** Exemplo de data no calendário, como a linha do tempo vai mostrar: "12 de Brumal de 312 E.C.". */
export function sampleDate(calendar: WorldCalendar): string {
  const month = calendar.months[0];
  const era = calendar.eras[calendar.eras.length - 1];
  if (!month) {
    return '';
  }
  const suffix = era?.abbreviation ? ` ${era.abbreviation}` : '';
  return `${Math.min(12, month.days)} de ${month.name} de 312${suffix}`;
}

/**
 * Calendário do mundo: eras em ordem (a última é a atual e não tem fim), meses com nome e dias, e dias da
 * semana. As datas da linha do tempo usam este calendário, e as idades são contadas por ele.
 */
@Component({
  selector: 'app-calendar-editor',
  imports: [RouterLink, FormsModule, AutoCompleteModule, ButtonModule, InputTextModule, ProgressSpinnerModule],
  templateUrl: './calendar-editor.html',
  styleUrl: './calendar-editor.scss',
})
export class CalendarEditorComponent implements HasUnsavedChanges {
  private readonly api = inject(UniverseApi);
  private readonly toast = inject(MessageService);

  readonly universeId = input.required<string>();

  readonly universe = signal<UniverseDetail | null>(null);
  readonly draft = signal<WorldCalendar>({ eras: [], months: [], weekdays: [] });
  private readonly saved = signal('');
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly presets = CALENDAR_PRESETS;

  readonly dirty = computed(() => this.saved() !== '' && stableJson(this.draft()) !== this.saved());
  readonly daysPerYear = computed(() => this.draft().months.reduce((sum, m) => sum + (Number(m.days) || 0), 0));
  readonly sample = computed(() => sampleDate(this.draft()));

  constructor() {
    queueMicrotask(() => void this.load());
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.dirty()) {
      event.preventDefault();
    }
  }

  hasUnsavedChanges(): boolean {
    return this.dirty();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const [universe, calendar] = await Promise.all([
        firstValueFrom(this.api.getUniverse(this.universeId())),
        firstValueFrom(this.api.calendar(this.universeId())),
      ]);
      this.universe.set(universe);
      this.reset(calendar);
    } catch (error) {
      this.error.set(problemMessage(error, 'Não foi possível abrir o calendário.'));
    } finally {
      this.loading.set(false);
    }
  }

  private reset(calendar: WorldCalendar): void {
    this.draft.set(structuredClone(calendar));
    this.saved.set(stableJson(calendar));
  }

  usePreset(preset: (typeof CALENDAR_PRESETS)[number]): void {
    // As eras do autor ficam: o modelo troca só meses e dias da semana
    const base = preset.calendar();
    this.draft.update((c) => ({ ...c, months: base.months, weekdays: base.weekdays }));
  }

  // ===== Eras =====

  setEra(index: number, change: Partial<CalendarEra>): void {
    this.draft.update((c) => ({ ...c, eras: c.eras.map((e, i) => (i === index ? { ...e, ...change } : e)) }));
  }

  /** Nova era no fim: a que era atual passa a ter fim (100 anos, para o autor ajustar). */
  addEra(): void {
    this.draft.update((c) => {
      const eras = c.eras.map((e, i) => (i === c.eras.length - 1 ? { ...e, years: e.years ?? 100 } : e));
      let n = eras.length + 1;
      while (eras.some((e) => e.key === `e${n}`)) {
        n++;
      }
      return { ...c, eras: [...eras, { key: `e${n}`, name: '', abbreviation: '', years: null }] };
    });
  }

  removeEra(index: number): void {
    this.draft.update((c) => {
      const eras = c.eras.filter((_, i) => i !== index);
      if (eras.length > 0) {
        eras[eras.length - 1] = { ...eras[eras.length - 1], years: null };
      }
      return { ...c, eras };
    });
  }

  // ===== Meses e semana =====

  setMonth(index: number, change: Partial<{ name: string; days: number }>): void {
    this.draft.update((c) => ({ ...c, months: c.months.map((m, i) => (i === index ? { ...m, ...change } : m)) }));
  }

  addMonth(): void {
    this.draft.update((c) => ({ ...c, months: [...c.months, { name: `Mês ${c.months.length + 1}`, days: 30 }] }));
  }

  removeMonth(index: number): void {
    this.draft.update((c) => ({ ...c, months: c.months.filter((_, i) => i !== index) }));
  }

  setWeekdays(days: string[] | null): void {
    this.draft.update((c) => ({ ...c, weekdays: days ?? [] }));
  }

  async save(): Promise<void> {
    this.saving.set(true);
    try {
      const saved = await firstValueFrom(this.api.saveCalendar(this.universeId(), this.draft()));
      this.reset(saved);
      this.toast.add({ severity: 'success', summary: 'Calendário salvo', life: 2500 });
    } catch (error) {
      this.toast.add({ severity: 'error', summary: problemMessage(error), life: 6000 });
    } finally {
      this.saving.set(false);
    }
  }

  discard(): void {
    this.draft.set(JSON.parse(this.saved()) as WorldCalendar);
  }
}
