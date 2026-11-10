import { EventKind, WorldCalendar, WorldDate } from '../../core/models/api.models';

/** Tipos de acontecimento, com rótulo e ícone. "Nascimento" é o que alimenta o cálculo de idade. */
export const EVENT_KINDS: { value: EventKind; label: string; icon: string }[] = [
  { value: 'birth', label: 'Nascimento', icon: 'pi-star' },
  { value: 'death', label: 'Morte', icon: 'pi-moon' },
  { value: 'war', label: 'Guerra', icon: 'pi-bolt' },
  { value: 'battle', label: 'Batalha', icon: 'pi-flag' },
  { value: 'founding', label: 'Fundação', icon: 'pi-building' },
  { value: 'coronation', label: 'Coroação', icon: 'pi-crown' },
  { value: 'treaty', label: 'Tratado', icon: 'pi-file-check' },
  { value: 'catastrophe', label: 'Catástrofe', icon: 'pi-exclamation-triangle' },
  { value: 'discovery', label: 'Descoberta', icon: 'pi-search' },
  { value: 'journey', label: 'Viagem', icon: 'pi-compass' },
  { value: 'wedding', label: 'Casamento', icon: 'pi-heart' },
];

export function kindOf(kind: EventKind | null): { value: EventKind; label: string; icon: string } | null {
  return EVENT_KINDS.find((k) => k.value === kind) ?? null;
}

/** Campos da data como a tela edita (tudo opcional; sem ano, o evento fica sem data). */
export interface DateDraft {
  era: string;
  year: number | null;
  month: number | null;
  day: number | null;
}

export function toDraft(date: WorldDate | null, calendar: WorldCalendar): DateDraft {
  const lastEra = calendar.eras[calendar.eras.length - 1]?.key ?? 'e1';
  return {
    era: date?.era ?? lastEra,
    year: date?.year ?? null,
    month: date?.month ?? null,
    day: date?.day ?? null,
  };
}

/** Data para enviar à API: sem ano não há data; sem mês, o dia é descartado. */
export function fromDraft(draft: DateDraft): WorldDate | null {
  if (!draft.year || draft.year < 1) {
    return null;
  }
  const month = draft.month ?? null;
  return { era: draft.era, year: Math.floor(draft.year), month, day: month ? (draft.day ?? null) : null };
}

/** Dias do mês escolhido (para limitar o campo de dia). */
export function daysIn(calendar: WorldCalendar, month: number | null): number {
  return month ? (calendar.months[month - 1]?.days ?? 31) : 31;
}
