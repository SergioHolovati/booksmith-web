import { CALENDAR_PRESETS, sampleDate } from './calendar-editor';

describe('calendário do mundo', () => {
  it('o exemplo usa o primeiro mês e a sigla da era atual', () => {
    expect(
      sampleDate({
        eras: [
          { key: 'a', name: 'Antiga', abbreviation: 'E.A.', years: 500 },
          { key: 'b', name: 'Cinzas', abbreviation: 'E.C.', years: null },
        ],
        months: [{ name: 'Brumal', days: 40 }],
        weekdays: [],
      }),
    ).toBe('12 de Brumal de 312 E.C.');
  });

  it('os modelos prontos somam o ano esperado', () => {
    const days = CALENDAR_PRESETS.map((p) => p.calendar().months.reduce((sum, m) => sum + m.days, 0));
    expect(days).toEqual([365, 360, 364]);
  });
});
