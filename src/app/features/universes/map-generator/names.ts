import { Random, pick } from './random';

/**
 * Nomes inventados com "sotaque": cada país sorteia uma cultura, e suas cidades soam parecidas entre si
 * (Valdren, Ostmar, Kesh-Turan, Aelwen). Sílabas fáceis de ler em português.
 */
export interface Culture {
  key: string;
  starts: readonly string[];
  middles: readonly string[];
  ends: readonly string[];
}

export const CULTURES: readonly Culture[] = [
  {
    key: 'meridional',
    starts: ['Val', 'Ar', 'Cor', 'Mar', 'Lu', 'Ven', 'Sol', 'Ter', 'Al', 'Ver', 'Cas', 'Bel', 'Mon', 'Fio'],
    middles: ['en', 'an', 'ar', 'or', 'is', 'el', 'on', 'ir', 'a', 'i'],
    ends: ['dor', 'mar', 'ia', 'ena', 'ano', 'ora', 'eira', 'al', 'ar', 'ona', 'ela', 'oso'],
  },
  {
    key: 'nortenha',
    starts: ['Ost', 'Hal', 'Bjor', 'Fen', 'Vald', 'Grim', 'Ulf', 'Kar', 'Sven', 'Ted', 'Hrof', 'Ask'],
    middles: ['a', 'e', 'i', 'o', 'ar', 'en'],
    ends: ['mar', 'heim', 'gard', 'vik', 'holt', 'stad', 'rik', 'fjord', 'borg', 'dal', 'ren', 'nes'],
  },
  {
    key: 'arida',
    starts: ['Kes', 'Zah', 'Mir', 'Ash', 'Tar', 'Qal', 'Sar', 'Har', 'Nah', 'Bas', 'Jem', 'Ra'],
    middles: ['a', 'i', 'u', 'ra', 'an', 'el'],
    ends: ['-Turan', 'ah', 'an', 'im', 'ar', 'esh', 'ad', 'ur', 'abad', 'iz', 'oum'],
  },
  {
    key: 'elfica',
    starts: ['Ael', 'Ith', 'Lor', 'Syl', 'Ela', 'Fae', 'Nim', 'Ril', 'Thal', 'Ili', 'Cael', 'Mae'],
    middles: ['a', 'e', 'ia', 'ae', 'il', 'or'],
    ends: ['wen', 'driel', 'thas', 'lin', 'dor', 'iel', 'ara', 'ion', 'eth', 'aen', 'is'],
  },
];

/** Gera nomes sem repetir dentro do mundo. */
export class NameMaker {
  private readonly used = new Set<string>();

  constructor(private readonly random: Random) {}

  name(culture: Culture): string {
    for (let attempt = 0; attempt < 30; attempt++) {
      const middle = this.random() < 0.45 ? pick(this.random, culture.middles) : '';
      const raw = pick(this.random, culture.starts) + middle + pick(this.random, culture.ends);
      const name = tidy(raw);
      if (name.length >= 4 && name.length <= 13 && !this.used.has(name)) {
        this.used.add(name);
        return name;
      }
    }
    // Muito raro: o gerador esgotou combinações curtas; um número ainda deixa o nome único
    const fallback = `${pick(this.random, culture.starts)}${this.used.size}`;
    this.used.add(fallback);
    return fallback;
  }
}

/** Sem três letras iguais seguidas nem vogal dobrada estranha; primeira letra maiúscula. */
export function tidy(raw: string): string {
  const cleaned = raw
    .toLowerCase()
    .replace(/(.)\1\1+/g, '$1$1')
    .replace(/([aeiou])\1/g, '$1');
  return cleaned
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('-');
}
