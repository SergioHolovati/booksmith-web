import { streakAfterToday } from '../../core/api/writing.api';
import { WritingStats } from '../../core/models/api.models';
import { barHeights, dayLabel } from './writing-goal-card';

describe('meta diária', () => {
  it('a escala do gráfico sempre mostra a meta, mesmo em dias fracos', () => {
    const { max, heights } = barHeights([{ day: '2026-11-09', words: 100 }, { day: '2026-11-10', words: 250 }], 500);
    expect(max).toBe(500);
    expect(heights).toEqual([20, 50]);
  });

  it('sem nada escrito não divide por zero', () => {
    expect(barHeights([{ day: '2026-11-10', words: 0 }], null).heights).toEqual([0]);
  });

  it('a data não anda um dia por causa do fuso', () => {
    expect(dayLabel('2026-11-10')).toContain('10');
  });

  it('bater a meta hoje soma o dia à sequência, uma vez só', () => {
    const stats: WritingStats = { today: 300, goal: 500, streak: 4, goalReached: false, history: [] };
    expect(streakAfterToday(stats, 499)).toBe(4);
    expect(streakAfterToday(stats, 520)).toBe(5);
    expect(streakAfterToday({ ...stats, goalReached: true, streak: 5 }, 900)).toBe(5);
  });
});
