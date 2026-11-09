import { PlaceSheet, PlaceSummary, PlaceType } from '../../core/models/api.models';

export const PLACE_TYPE_LABEL: Record<PlaceType, string> = {
  city: 'Cidade',
  town: 'Vila / povoado',
  neighborhood: 'Bairro',
  building: 'Construção',
  home: 'Casa',
  school: 'Escola',
  workplace: 'Trabalho',
  shop: 'Comércio',
  nature: 'Natureza',
  water: 'Mar / rio / lago',
  mountain: 'Montanha',
  realm: 'Reino / país',
  region: 'Região',
  planet: 'Planeta / mundo',
  vehicle: 'Veículo / nave',
  other: 'Outro',
};

export const PLACE_TYPE_OPTIONS = (Object.keys(PLACE_TYPE_LABEL) as PlaceType[]).map((value) => ({
  value,
  label: PLACE_TYPE_LABEL[value],
}));

export const PLACE_ICON: Partial<Record<PlaceType, string>> = {
  city: 'pi-building',
  town: 'pi-home',
  neighborhood: 'pi-map',
  building: 'pi-building',
  home: 'pi-home',
  school: 'pi-book',
  workplace: 'pi-briefcase',
  shop: 'pi-shop',
  nature: 'pi-sun',
  water: 'pi-cloud',
  mountain: 'pi-chevron-up',
  realm: 'pi-flag',
  region: 'pi-map',
  planet: 'pi-globe',
  vehicle: 'pi-car',
};

/** Campos de texto da ficha, na ordem da tela. */
export const PLACE_FIELDS: { key: keyof PlaceSheet; label: string; placeholder: string; long: boolean }[] = [
  { key: 'location', label: 'Onde fica', placeholder: 'Ex.: na esquina da praça, ao norte do rio', long: false },
  { key: 'description', label: 'Descrição', placeholder: 'Como é o lugar? O que se vê ao chegar?', long: true },
  { key: 'atmosphere', label: 'Clima e sensações', placeholder: 'Sons, cheiros, luz, temperatura, quem costuma estar lá', long: true },
  { key: 'rules', label: 'Regras do lugar', placeholder: 'O que pode ou não acontecer aqui. Ex.: "a magia não funciona dentro dos muros"', long: true },
  { key: 'history', label: 'História', placeholder: 'O que aconteceu aqui antes do livro', long: true },
  { key: 'notes', label: 'Anotações', placeholder: 'Qualquer outra coisa', long: true },
];

export interface PlaceNode {
  place: PlaceSummary;
  depth: number;
}

/**
 * Lugares em árvore, achatada para a lista: cada lugar seguido do que está dentro dele, em ordem
 * alfabética. Lugares cujo "dentro de" sumiu aparecem na raiz.
 */
export function placeTree(places: PlaceSummary[]): PlaceNode[] {
  const ids = new Set(places.map((p) => p.id));
  const children = new Map<string | null, PlaceSummary[]>();
  for (const place of places) {
    const parent = place.parentId && ids.has(place.parentId) ? place.parentId : null;
    children.set(parent, [...(children.get(parent) ?? []), place]);
  }
  const result: PlaceNode[] = [];
  const visit = (parent: string | null, depth: number, seen: Set<string>) => {
    const list = [...(children.get(parent) ?? [])].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    for (const place of list) {
      if (seen.has(place.id)) {
        continue;
      }
      seen.add(place.id);
      result.push({ place, depth });
      visit(place.id, depth + 1, seen);
    }
  };
  visit(null, 0, new Set());
  return result;
}

/** Ids do lugar e de tudo o que está dentro dele: não podem ser escolhidos como "dentro de". */
export function selfAndDescendants(places: PlaceSummary[], id: string): Set<string> {
  const result = new Set([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const place of places) {
      if (place.parentId && result.has(place.parentId) && !result.has(place.id)) {
        result.add(place.id);
        grew = true;
      }
    }
  }
  return result;
}
