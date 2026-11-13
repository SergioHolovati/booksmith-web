import { InviteView } from '../../../core/models/api.models';
import { inviteLink, inviteMessage, inviteState } from './invites';

function invite(over: Partial<InviteView> = {}): InviteView {
  return { id: '1', code: 'BETA-7KQ2-M9XA', maxUses: 1, usedCount: 0, note: null, expiresAt: null, createdAt: '', active: true, ...over };
}

describe('convites do beta', () => {
  it('o link abre o cadastro com o código', () => {
    expect(inviteLink('BETA-7KQ2-M9XA', 'https://app.booksmith.com.br'))
      .toBe('https://app.booksmith.com.br/register?convite=BETA-7KQ2-M9XA');
    expect(inviteMessage('BETA-7KQ2-M9XA', 'https://x')).toContain('código BETA-7KQ2-M9XA');
  });

  it('diz em que pé está cada convite', () => {
    expect(inviteState(invite())).toBe('não usado');
    expect(inviteState(invite({ maxUses: 5, usedCount: 3 }))).toBe('3 de 5 usos');
    expect(inviteState(invite({ maxUses: 2, usedCount: 2 }))).toBe('esgotado');
    expect(inviteState(invite({ expiresAt: '2020-01-01T00:00:00Z' }))).toBe('cancelado ou vencido');
  });
});
