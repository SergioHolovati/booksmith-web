import { since } from '../../core/util/relative-time';

describe('since', () => {
  const now = new Date('2026-11-06T12:00:00Z');
  const ago = (minutes: number) => new Date(now.getTime() - minutes * 60_000);

  it('agrupa a última hora como "há pouco"', () => {
    expect(since(ago(5), now)).toBe('há pouco');
    expect(since(ago(59), now)).toBe('há pouco');
  });

  it('usa horas no mesmo dia e dias depois disso', () => {
    expect(since(ago(3 * 60), now)).toBe('há 3 horas');
    expect(since(ago(26 * 60), now)).toBe('ontem');
    expect(since(ago(5 * 24 * 60), now)).toBe('há 5 dias');
  });
});
