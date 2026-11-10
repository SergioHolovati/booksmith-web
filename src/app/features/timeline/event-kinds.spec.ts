import { WorldCalendar } from '../../core/models/api.models';
import { daysIn, fromDraft, kindOf, toDraft } from './event-kinds';

const calendar: WorldCalendar = {
  eras: [
    { key: 'antiga', name: 'Era Antiga', abbreviation: 'E.A.', years: 500 },
    { key: 'e2', name: 'Era das Cinzas', abbreviation: 'E.C.', years: null },
  ],
  months: [
    { name: 'Brumal', days: 40 },
    { name: 'Floral', days: 30 },
  ],
  weekdays: [],
};

describe('datas e tipos de evento', () => {
  it('evento sem data começa na era atual, sem ano', () => {
    expect(toDraft(null, calendar)).toEqual({ era: 'e2', year: null, month: null, day: null });
    expect(fromDraft(toDraft(null, calendar))).toBeNull();
  });

  it('sem mês, o dia é descartado', () => {
    expect(fromDraft({ era: 'e2', year: 312, month: null, day: 12 })).toEqual({
      era: 'e2',
      year: 312,
      month: null,
      day: null,
    });
    expect(fromDraft({ era: 'antiga', year: 40, month: 1, day: 12 })).toEqual({
      era: 'antiga',
      year: 40,
      month: 1,
      day: 12,
    });
  });

  it('o dia vai até o tamanho do mês escolhido', () => {
    expect(daysIn(calendar, 1)).toBe(40);
    expect(daysIn(calendar, 2)).toBe(30);
    expect(daysIn(calendar, null)).toBe(31);
  });

  it('cada tipo tem rótulo e ícone', () => {
    expect(kindOf('birth')?.label).toBe('Nascimento');
    expect(kindOf(null)).toBeNull();
  });
});
