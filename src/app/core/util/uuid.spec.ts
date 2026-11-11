import { uuidV4 } from './uuid';

describe('uuidV4', () => {
  it('gera UUID versão 4, diferente a cada vez', () => {
    const id = uuidV4();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(uuidV4()).not.toBe(id);
  });
});
