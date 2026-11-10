import { AppearanceField, AppearanceValue } from '../../core/models/api.models';

/**
 * Leitura dos valores de um campo definido por dados (montador de personagem, construtor de universo, fichas do
 * mundo). Fica em shared porque o campo genérico (builder-field) e as features usam; features dependem de shared,
 * nunca o contrário.
 */

/** Valor que não é uma das opções do campo: texto livre ("Outro"). */
export function isCustom(field: AppearanceField, value: unknown): value is string {
  return typeof value === 'string' && value !== '' && !(field.options ?? []).some((o) => o.value === value);
}

/** O valor de um campo de escolha múltipla como lista (vazia se ainda não foi preenchido). */
export function asList(value: AppearanceValue | undefined): string[] {
  return Array.isArray(value) ? value : [];
}
