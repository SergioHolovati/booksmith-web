/**
 * Código de barras do ISBN (EAN-13), o que livrarias e gráficas leem na contracapa. O ISBN-13 é o próprio número
 * EAN; o ISBN-10 antigo vira 978 + os 9 primeiros dígitos + um dígito verificador novo.
 */

const L = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011'];
const G = ['0100111', '0110011', '0011011', '0100001', '0011101', '0111001', '0000101', '0010001', '0001001', '0010111'];
const R = ['1110010', '1100110', '1101100', '1000010', '1011100', '1001110', '1010000', '1000100', '1001000', '1110100'];
/** Qual metade esquerda usa L ou G, pelo primeiro dígito. */
const PARITY = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'];

function checkDigit(twelve: string): number {
  const sum = [...twelve].reduce((acc, d, i) => acc + Number(d) * (i % 2 === 0 ? 1 : 3), 0);
  return (10 - (sum % 10)) % 10;
}

/** Os 13 dígitos do ISBN (com o verificador conferido), ou null se não é um ISBN válido. */
export function isbn13(isbn: string | null | undefined): string | null {
  const digits = (isbn ?? '').replace(/[^0-9Xx]/g, '').toUpperCase();
  if (digits.length === 10) {
    const twelve = '978' + digits.slice(0, 9);
    return twelve + checkDigit(twelve);
  }
  if (digits.length !== 13 || !/^\d{13}$/.test(digits)) {
    return null;
  }
  return checkDigit(digits.slice(0, 12)) === Number(digits[12]) ? digits : null;
}

/** As 95 faixas (1 = barra, 0 = espaço) do EAN-13, ou null se o número não é válido. */
export function ean13Modules(isbn: string | null | undefined): string | null {
  const code = isbn13(isbn);
  if (!code) {
    return null;
  }
  const parity = PARITY[Number(code[0])];
  let bars = '101';
  for (let i = 1; i <= 6; i++) {
    bars += (parity[i - 1] === 'L' ? L : G)[Number(code[i])];
  }
  bars += '01010';
  for (let i = 7; i <= 12; i++) {
    bars += R[Number(code[i])];
  }
  return bars + '101';
}

/**
 * Desenha o código num quadro branco (largura × altura em px), com "ISBN …" em cima e os dígitos embaixo. As barras
 * das guardas (começo, meio, fim) descem um pouco mais, como no padrão.
 */
export function drawBarcode(ctx: CanvasRenderingContext2D, isbn: string, x: number, y: number, w: number, h: number): boolean {
  const modules = ean13Modules(isbn);
  const code = isbn13(isbn);
  if (!modules || !code) {
    return false;
  }
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x, y, w, h);
  const pad = w * 0.08;
  const module = (w - 2 * pad) / 95;
  const label = h * 0.13;
  const top = y + pad * 0.6 + label;
  const barHeight = h - (top - y) - h * 0.2;
  ctx.fillStyle = '#000000';
  for (let i = 0; i < 95; i++) {
    if (modules[i] === '1') {
      const guard = i < 3 || (i >= 45 && i < 50) || i >= 92;
      ctx.fillRect(x + pad + i * module, top, module + 0.2, barHeight + (guard ? h * 0.06 : 0));
    }
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.font = `600 ${label * 0.8}px Inter, Arial, sans-serif`;
  const hyphenated = `${code.slice(0, 3)}-${code.slice(3, 5)}-${code.slice(5, 9)}-${code.slice(9, 12)}-${code[12]}`;
  ctx.fillText(`ISBN ${hyphenated}`, x + w / 2, y + pad * 0.4);
  ctx.font = `400 ${h * 0.13}px Inter, Arial, sans-serif`;
  ctx.fillText(`${code[0]}  ${code.slice(1, 7)}  ${code.slice(7)}`, x + w / 2, top + barHeight + h * 0.07);
  ctx.restore();
  return true;
}
