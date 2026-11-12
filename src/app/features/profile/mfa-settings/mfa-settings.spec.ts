import { groupSecret, qrDataUrl, recoveryText } from './mfa-settings';
import { mfaHint } from '../../auth/mfa-challenge/mfa-challenge';

describe('verificação em duas etapas', () => {
  it('a chave do app aparece em grupos de 4 para digitar', () => {
    expect(groupSecret('ABCDEFGHIJKLMNOP2345')).toBe('ABCD EFGH IJKL MNOP 2345');
  });

  it('o QR code sai como imagem', () => {
    expect(qrDataUrl('otpauth://totp/Booksmith%3Alia%40example.com?secret=ABCD&issuer=Booksmith'))
      .toMatch(/^data:image\/gif;base64,/);
  });

  it('o arquivo dos códigos traz a conta e um código por linha', () => {
    const text = recoveryText(['ABCD-2345', 'EFGH-6789'], 'lia@example.com');
    expect(text).toContain('Conta: lia@example.com');
    expect(text.split('\n')).toContain('EFGH-6789');
  });

  it('a tela do login explica o código conforme os métodos da conta', () => {
    expect(mfaHint(['totp'], false)).toContain('app autenticador');
    expect(mfaHint(['email'], false)).toContain('Enviar código por e-mail');
    expect(mfaHint(['totp', 'email'], true)).toContain('códigos de recuperação');
  });
});
