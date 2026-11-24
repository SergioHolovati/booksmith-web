import { aiWindow } from '../../shared/assist/ai-window.pipe';
import { MyPlan } from '../../core/api/plan.api';
import { ROWS, count, sourceLabel } from './my-plan';

describe('meu plano', () => {
  const free = {
    books: 1, universes: 1, charactersPerUniverse: 15, aiUses: 3, aiWindowHours: 168,
    illustrationsPerWeek: 0, epub: false, print: false,
  };
  const author = { ...free, books: -1, universes: -1, charactersPerUniverse: -1, aiUses: 10, aiWindowHours: 24,
    illustrationsPerWeek: 12, epub: true, print: true };

  it('mostra os limites de cada plano em palavras', () => {
    expect(ROWS.map((r) => r.value(free))).toEqual(['1', '1', '15', '3 por semana', '—', '—', '—']);
    expect(ROWS.map((r) => r.value(author))).toEqual(
      ['Ilimitados', 'Ilimitados', 'Ilimitados', '10 por dia', '12 por semana', 'Sim', 'Sim']);
    expect(count(-1)).toBe('Ilimitados');
  });

  it('diz se o plano é de fundador ou cortesia', () => {
    const base: Omit<MyPlan, 'source' | 'founder'> = {
      plan: 'AUTOR', label: 'Autor', expiresAt: null, limits: author, plans: [], plansUrl: null,
    };
    expect(sourceLabel({ ...base, source: 'founder', founder: true })).toBe('Fundador');
    expect(sourceLabel({ ...base, source: 'courtesy', founder: false })).toBe('Cortesia');
    expect(sourceLabel({ ...base, source: null, founder: false })).toBeNull();
  });

  it('a janela da IA acompanha o plano', () => {
    expect(aiWindow(24, 'nas')).toBe('nas últimas 24 horas');
    expect(aiWindow(168, 'nas')).toBe('nos últimos 7 dias');
    expect(aiWindow(168, 'das')).toBe('dos últimos 7 dias');
    expect(aiWindow(undefined, 'das')).toBe('das últimas 24 horas');
  });
});
