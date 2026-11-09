import {
  AppearanceField,
  AppearanceFormDefinition,
  AppearanceGroup,
  AppearanceTab,
  AppearanceValue,
  AppearanceValues,
} from '../../core/models/api.models';

/** Valor que não é uma das opções do campo: texto livre ("Outro"). */
export function isCustom(field: AppearanceField, value: unknown): value is string {
  return typeof value === 'string' && value !== '' && !(field.options ?? []).some((o) => o.value === value);
}

/** Cópia dos valores com {@code key} trocado; valor vazio remove a chave. */
export function withValue(values: AppearanceValues, key: string, value: AppearanceValue | null): AppearanceValues {
  const next = { ...values };
  const empty =
    value === null || (typeof value === 'string' && value.trim() === '') || (Array.isArray(value) && value.length === 0);
  if (empty) {
    delete next[key];
  } else {
    next[key] = value;
  }
  return next;
}

/** Escolha única: tocar na opção já escolhida desmarca. */
export function toggleChoice(values: AppearanceValues, key: string, option: string): AppearanceValues {
  return withValue(values, key, values[key] === option ? null : option);
}

/** Escolha múltipla: liga ou desliga a opção, mantendo a ordem em que foram marcadas. */
export function toggleMulti(values: AppearanceValues, key: string, option: string): AppearanceValues {
  const current = asList(values[key]);
  const next = current.includes(option) ? current.filter((v) => v !== option) : [...current, option];
  return withValue(values, key, next);
}

export function asList(value: AppearanceValue | undefined): string[] {
  return Array.isArray(value) ? value : [];
}

/**
 * JSON com as chaves em ordem: compara o rascunho com o que foi salvo sem se enganar com a ordem em que os
 * campos foram preenchidos.
 */
export function stableJson(value: unknown): string {
  return JSON.stringify(value, (_key, v: unknown) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)))
      : v,
  );
}

// ===== Montador (aparência e personalidade) =====

/** Abas de um grupo do montador: "appearance" (Aparência) ou "personality" (Personalidade). */
export function tabsOf(form: AppearanceFormDefinition, group: AppearanceGroup): AppearanceTab[] {
  return form.tabs.filter((t) => (t.group ?? 'appearance') === group);
}

/** Texto de um valor como a pessoa leu na tela: o rótulo da opção, o da escala ou o texto livre. */
export function valueText(field: AppearanceField, value: AppearanceValue | undefined): string | null {
  if (value === undefined || value === '') {
    return null;
  }
  if (typeof value === 'number') {
    return field.labels?.[value - (field.min ?? 1)] ?? String(value);
  }
  const label = (v: string) => field.options?.find((o) => o.value === v)?.label ?? v;
  if (Array.isArray(value)) {
    return value.length === 0 ? null : value.map(label).join(', ');
  }
  return label(value);
}

/**
 * Retrato em texto do que foi preenchido, uma linha por aba: "Rosto: Cor dos olhos verdes…". É o que a
 * pessoa confere enquanto monta, e a base da descrição para a ilustração com IA.
 */
export function describe(tabs: AppearanceTab[], values: AppearanceValues): { tab: string; text: string }[] {
  const lines: { tab: string; text: string }[] = [];
  for (const tab of tabs) {
    const parts: string[] = [];
    for (const field of tab.fields) {
      const text = valueText(field, values[field.key]);
      if (text !== null) {
        // Nos controles de temperamento o rótulo da posição já diz tudo ("Muito introvertido")
        parts.push(field.poles ? text : `${field.label}: ${text}`);
      }
    }
    if (parts.length > 0) {
      lines.push({ tab: tab.label, text: parts.join(' · ') });
    }
  }
  return lines;
}

/** Quantos campos das abas já têm valor, e quantos existem. */
export function progress(tabs: AppearanceTab[], values: AppearanceValues): { filled: number; total: number } {
  const fields = tabs.flatMap((t) => t.fields);
  return { filled: fields.filter((f) => values[f.key] !== undefined).length, total: fields.length };
}

/**
 * Sorteia o que ainda está vazio na aba, como o dado dos jogos: só escolhas, cores e escalas; textos e listas
 * ficam com o autor. O que já foi escolhido não muda.
 */
export function rollEmpty(tab: AppearanceTab, values: AppearanceValues, random: () => number = Math.random): AppearanceValues {
  let next = values;
  for (const field of tab.fields) {
    if (next[field.key] !== undefined) {
      continue;
    }
    if ((field.type === 'choice' || field.type === 'color') && field.options?.length) {
      next = withValue(next, field.key, field.options[Math.floor(random() * field.options.length)].value);
    } else if (field.type === 'scale') {
      const min = field.min ?? 1;
      const max = field.max ?? 5;
      next = withValue(next, field.key, min + Math.floor(random() * (max - min + 1)));
    }
  }
  return next;
}
