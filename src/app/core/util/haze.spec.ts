import { hazeAlpha, hazeBackground } from './haze';

describe('haze', () => {
  it('é cheia no miolo e some na borda (a mesma conta do PDF)', () => {
    expect(hazeAlpha(0.5, 0.5, 0.86)).toBeCloseTo(0.86);
    expect(hazeAlpha(0, 0.5, 0.86)).toBe(0);
    expect(hazeAlpha(0.5, 1, 0.86)).toBe(0);
    expect(hazeAlpha(0.9, 0.5, 0.86)).toBeGreaterThan(0);
  });

  it('dá um fundo para a caixa do texto', () => {
    expect(hazeBackground(true)).toMatch(/^(url\(|radial-gradient)/);
  });
});
