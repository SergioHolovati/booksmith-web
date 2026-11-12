import { USERNAME_PATTERN } from '../complete-profile/complete-profile';
import { cleanCode } from './verify-email';

describe('confirmar e-mail e completar cadastro', () => {
  it('o código colado do e-mail vira 6 caracteres maiúsculos', () => {
    expect(cleanCode(' ab 12-cd ')).toBe('AB12CD');
    expect(cleanCode('robo42xyz')).toBe('ROBO42');
  });

  it('nome de usuário segue a regra do servidor', () => {
    expect(USERNAME_PATTERN.test('lia.moreau')).toBe(true);
    expect(USERNAME_PATTERN.test('lia_m-2')).toBe(true);
    expect(USERNAME_PATTERN.test('l')).toBe(false);
    expect(USERNAME_PATTERN.test('lia moreau')).toBe(false);
    expect(USERNAME_PATTERN.test('lía')).toBe(false);
  });
});
