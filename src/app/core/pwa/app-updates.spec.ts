import { APPLY_AT_START_MS, applyNow } from './app-updates';

describe('atualização do app instalado', () => {
  it('entra na hora logo ao abrir o app', () => {
    expect(applyNow(1_000, 1_000 + APPLY_AT_START_MS, false)).toBe(true);
  });

  it('com o app em uso, espera a pessoa sair', () => {
    expect(applyNow(1_000, 1_000 + APPLY_AT_START_MS + 1, false)).toBe(false);
  });

  it('com o app em segundo plano, entra na hora', () => {
    expect(applyNow(1_000, 1_000_000, true)).toBe(true);
  });
});
