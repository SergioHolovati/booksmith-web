import { ean13Modules, isbn13 } from './isbn-barcode';

describe('código de barras do ISBN (EAN-13)', () => {
  it('confere o dígito verificador e aceita o ISBN com hífens', () => {
    expect(isbn13('978-85-359-0277-8')).toBe('9788535902778');
    expect(isbn13('978-85-359-0277-9')).toBeNull();
    expect(isbn13('')).toBeNull();
    expect(isbn13(null)).toBeNull();
  });

  it('o ISBN-10 antigo vira ISBN-13 com 978 e um verificador novo', () => {
    // 0-306-40615-2 → 978-0-306-40615-7
    expect(isbn13('0-306-40615-2')).toBe('9780306406157');
  });

  it('95 faixas, com as guardas de começo, meio e fim', () => {
    const modules = ean13Modules('9780306406157')!;
    expect(modules).toHaveLength(95);
    expect(modules.slice(0, 3)).toBe('101');
    expect(modules.slice(45, 50)).toBe('01010');
    expect(modules.slice(-3)).toBe('101');
    // Primeiro dígito 9: metade esquerda L G G L G L; o "7" (segundo dígito) em L é 0111011
    expect(modules.slice(3, 10)).toBe('0111011');
  });
});
