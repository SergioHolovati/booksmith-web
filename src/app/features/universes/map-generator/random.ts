/** Aleatoriedade reproduzível: a mesma semente gera sempre o mesmo mundo. */
export type Random = () => number;

/** Texto → número de 32 bits (FNV-1a): "vel-42" vira sempre a mesma semente. */
export function hashSeed(seed: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Gerador mulberry32: rápido, pequeno e bom o bastante para mapas. Devolve números em [0, 1). */
export function seededRandom(seed: string | number): Random {
  let state = typeof seed === 'number' ? seed >>> 0 : hashSeed(seed);
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Sub-gerador independente para uma parte do mundo (relevo, nomes…): mudar uma não muda as outras. */
export function fork(seed: string, part: string): Random {
  return seededRandom(`${seed}/${part}`);
}

export function pick<T>(random: Random, items: readonly T[]): T {
  return items[Math.floor(random() * items.length)];
}

/** Semente nova, curta e fácil de copiar: "lua-7k2q". */
export function newSeed(): string {
  const words = ['lua', 'sol', 'mar', 'vale', 'rio', 'pico', 'bruma', 'vento', 'cinza', 'ouro', 'ferro', 'sal'];
  const random = seededRandom(Date.now() ^ Math.floor(Math.random() * 1e9));
  return `${pick(random, words)}-${Math.floor(random() * 36 ** 4)
    .toString(36)
    .padStart(4, '0')}`;
}
