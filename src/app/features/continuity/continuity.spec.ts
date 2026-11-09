import { quoteParts } from './continuity';

describe('destaque na citação do alerta', () => {
  it('destaca a primeira ocorrência, sem diferenciar maiúsculas', () => {
    expect(quoteParts('Os olhos azuis de Lia brilhavam.', 'azuis')).toEqual([
      { text: 'Os olhos ', mark: false },
      { text: 'azuis', mark: true },
      { text: ' de Lia brilhavam.', mark: false },
    ]);
    expect(quoteParts('Kaell chegou.', 'kaell')).toEqual([
      { text: 'Kaell', mark: true },
      { text: ' chegou.', mark: false },
    ]);
  });

  it('sem o destaque na citação, devolve o texto inteiro', () => {
    expect(quoteParts('Texto sem a palavra.', 'azuis')).toEqual([{ text: 'Texto sem a palavra.', mark: false }]);
  });
});
