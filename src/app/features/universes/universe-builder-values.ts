import {
  AppearanceValue,
  AppearanceValues,
  UniverseBuilderDefinition,
  UniverseCollection,
  UniverseDetails,
  UniverseItem,
} from '../../core/models/api.models';
import { describe, withValue } from '../characters/appearance-values';

/** Itens de uma coleção (sistemas de magia, leis); lista vazia se não houver. */
export function itemsOf(details: UniverseDetails, key: string): UniverseItem[] {
  const value = details[key];
  return Array.isArray(value) && value.every((v) => typeof v === 'object') ? (value as UniverseItem[]) : [];
}

/** Só os campos simples (sem as coleções), no formato que o retrato e o dado entendem. */
export function plainValues(form: UniverseBuilderDefinition, details: UniverseDetails): AppearanceValues {
  const collections = new Set(Object.keys(form.collections));
  return Object.fromEntries(
    Object.entries(details).filter(([key]) => !collections.has(key)),
  ) as AppearanceValues;
}

/** Cópia do conteúdo com um campo simples trocado; valor vazio remove. */
export function withDetail(details: UniverseDetails, key: string, value: AppearanceValue | null): UniverseDetails {
  return withValue(details as AppearanceValues, key, value) as UniverseDetails;
}

/** Cópia do conteúdo com a lista de itens trocada; lista vazia remove a chave. */
export function withItems(details: UniverseDetails, key: string, items: UniverseItem[]): UniverseDetails {
  const next = { ...details };
  if (items.length === 0) {
    delete next[key];
  } else {
    next[key] = items;
  }
  return next;
}

/** Item com um campo trocado (o id fica). */
export function withItemValue(item: UniverseItem, key: string, value: AppearanceValue | null): UniverseItem {
  return withValue(item, key, value) as UniverseItem;
}

/** Nome do item na lista: o campo-título ou, sem ele, "Sistema de magia 2". */
export function itemTitle(collection: UniverseCollection, item: UniverseItem, index: number): string {
  const title = item[collection.titleField];
  return typeof title === 'string' && title.trim() ? title : `${collection.label} ${index + 1}`;
}

/**
 * O universo em texto, uma linha por passo preenchido: os campos como no montador de personagem e, nos passos
 * de coleção, os nomes dos itens ("Magia: Tecelagem de Sombras, Runas").
 */
export function universePortrait(
  form: UniverseBuilderDefinition,
  details: UniverseDetails,
  mapUrl: string | null,
): { tab: string; text: string }[] {
  const plain = plainValues(form, details);
  const lines: { tab: string; text: string }[] = [];
  for (const step of form.tabs) {
    const parts = describe([step], plain).map((line) => line.text);
    if (step.map && mapUrl) {
      parts.unshift('Mapa desenhado');
    }
    const collection = step.collection ? form.collections[step.collection] : undefined;
    if (collection && step.collection) {
      const items = itemsOf(details, step.collection);
      if (items.length > 0) {
        parts.push(items.map((item, i) => itemTitle(collection, item, i)).join(', '));
      }
    }
    if (parts.length > 0) {
      lines.push({ tab: step.label, text: parts.join(' · ') });
    }
  }
  return lines;
}

/** Progresso: campos simples preenchidos, o mapa e cada coleção com ao menos um item. */
export function universeProgress(
  form: UniverseBuilderDefinition,
  details: UniverseDetails,
  mapUrl: string | null,
): { filled: number; total: number } {
  const plain = plainValues(form, details);
  const fields = form.tabs.flatMap((t) => t.fields);
  const collections = Object.keys(form.collections);
  const hasMapStep = form.tabs.some((t) => t.map);
  return {
    filled:
      fields.filter((f) => plain[f.key] !== undefined).length +
      collections.filter((key) => itemsOf(details, key).length > 0).length +
      (hasMapStep && mapUrl ? 1 : 0),
    total: fields.length + collections.length + (hasMapStep ? 1 : 0),
  };
}

/** Id novo para um item criado no aparelho (o servidor aceita letras, números, "-" e "_"). */
export function newItemId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `i${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
