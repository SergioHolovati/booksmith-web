import { conversationLines } from './support-conversation';
import { SUPPORT_STATUS } from './support-requests';

describe('conversa do pedido de suporte', () => {
  it('começa pelo que a pessoa mandou e segue com as respostas', () => {
    const lines = conversationLines({
      request: {
        id: 'r1',
        protocol: 'BS-3F9A2C71',
        category: 'bug',
        message: 'O botão sumiu.',
        priority: 'normal',
        status: 'waiting_user',
        email: 'lia@exemplo.com',
        createdAt: '2026-11-24T10:00:00Z',
        lastActivityAt: '2026-11-24T11:00:00Z',
      },
      messages: [
        { id: 'm1', author: 'staff', body: 'Já corrigimos.', createdAt: '2026-11-24T11:00:00Z' },
        { id: 'm2', author: 'user', body: 'Obrigada!', createdAt: '2026-11-24T11:10:00Z' },
      ],
    });
    expect(lines.map((l) => [l.mine, l.body])).toEqual([
      [true, 'O botão sumiu.'],
      [false, 'Já corrigimos.'],
      [true, 'Obrigada!'],
    ]);
  });

  it('dá nome a cada situação', () => {
    expect(SUPPORT_STATUS.waiting_user).toBe('Respondido');
    expect(SUPPORT_STATUS.resolved).toBe('Resolvido');
  });
});
