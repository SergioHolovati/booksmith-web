import { CharacterSummary, Relation, RelationKind } from '../../core/models/api.models';

/**
 * Tipos de relação. `forward` é como se lê de quem a relação parte ("Ana é mãe de Lia"); `backward`, do outro
 * lado ("Lia é filha de Ana"). Nos tipos sem direção, os dois textos são iguais. `group` dá a cor no mapa.
 */
export const RELATION_KINDS: {
  value: RelationKind;
  label: string;
  forward: string;
  backward: string;
  group: 'family' | 'love' | 'bond' | 'conflict' | 'duty' | 'other';
}[] = [
  { value: 'parent', label: 'Pai ou mãe', forward: 'pai ou mãe de', backward: 'filho ou filha de', group: 'family' },
  { value: 'sibling', label: 'Irmãos', forward: 'irmão ou irmã de', backward: 'irmão ou irmã de', group: 'family' },
  { value: 'spouse', label: 'Casados', forward: 'casado(a) com', backward: 'casado(a) com', group: 'love' },
  { value: 'romance', label: 'Romance', forward: 'romance com', backward: 'romance com', group: 'love' },
  { value: 'friend', label: 'Amizade', forward: 'amigo(a) de', backward: 'amigo(a) de', group: 'bond' },
  { value: 'ally', label: 'Aliados', forward: 'aliado(a) de', backward: 'aliado(a) de', group: 'bond' },
  { value: 'mentor', label: 'Mentor', forward: 'mentor(a) de', backward: 'aprendiz de', group: 'duty' },
  { value: 'serves', label: 'Serve a', forward: 'serve a', backward: 'servido(a) por', group: 'duty' },
  { value: 'rival', label: 'Rivais', forward: 'rival de', backward: 'rival de', group: 'conflict' },
  { value: 'enemy', label: 'Inimigos', forward: 'inimigo(a) de', backward: 'inimigo(a) de', group: 'conflict' },
  { value: 'other', label: 'Outra', forward: 'ligado(a) a', backward: 'ligado(a) a', group: 'other' },
];

export const GROUP_COLOR: Record<(typeof RELATION_KINDS)[number]['group'], string> = {
  family: '#d6a06a',
  love: '#e0789a',
  bond: '#6aa35a',
  conflict: '#d0583c',
  duty: '#4a7fc2',
  other: '#8a8a8a',
};

export function kindInfo(kind: RelationKind): (typeof RELATION_KINDS)[number] {
  return RELATION_KINDS.find((k) => k.value === kind) ?? RELATION_KINDS[RELATION_KINDS.length - 1];
}

/** Como a relação se lê do ponto de vista de um personagem: "mãe de Lia", "filha de Ana". */
export function describeFor(relation: Relation, characterId: string): { text: string; other: string; otherId: string } {
  const info = kindInfo(relation.kind);
  const outgoing = relation.from.id === characterId;
  const other = outgoing ? relation.to : relation.from;
  return { text: outgoing ? info.forward : info.backward, other: other.name, otherId: other.id };
}

/**
 * Posições do mapa de relações: personagens com relação num círculo (os mais ligados primeiro, para o desenho
 * ficar equilibrado), os sem relação de fora. Coordenadas num quadro de 0 a 100.
 */
export function relationLayout(
  characters: CharacterSummary[],
  relations: Relation[],
): { id: string; name: string; x: number; y: number; links: number }[] {
  const links = new Map<string, number>();
  for (const r of relations) {
    links.set(r.from.id, (links.get(r.from.id) ?? 0) + 1);
    links.set(r.to.id, (links.get(r.to.id) ?? 0) + 1);
  }
  const linked = characters
    .filter((c) => links.has(c.id))
    .sort((a, b) => (links.get(b.id) ?? 0) - (links.get(a.id) ?? 0) || a.name.localeCompare(b.name, 'pt-BR'));
  const radius = linked.length <= 2 ? 25 : 38;
  return linked.map((c, i) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / linked.length;
    return {
      id: c.id,
      name: c.name,
      x: Math.round((50 + radius * Math.cos(angle)) * 10) / 10,
      y: Math.round((50 + radius * Math.sin(angle)) * 10) / 10,
      links: links.get(c.id) ?? 0,
    };
  });
}
