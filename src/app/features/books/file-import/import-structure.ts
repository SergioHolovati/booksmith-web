import { DivisionKind, ImportDivision, ImportStructure, OutlineItem, OutlineKind, StructureRequest } from '../../../core/models/api.models';

/** O que a tela mostra para cada tipo de divisão. */
export const DIVISION_KINDS: { value: DivisionKind; label: string }[] = [
  { value: 'chapter', label: 'Capítulo' },
  { value: 'unnumbered', label: 'Sem número' },
  { value: 'section', label: 'Subcapítulo' },
  { value: 'part', label: 'Parte' },
  { value: 'dedication', label: 'Dedicatória' },
  { value: 'text', label: 'É texto' },
  { value: 'remove', label: 'Tirar' },
];

export const OUTLINE_KINDS: { value: OutlineKind; label: string }[] = [
  { value: 'chapter', label: 'Capítulo' },
  { value: 'unnumbered', label: 'Sem número' },
  { value: 'section', label: 'Subcapítulo' },
  { value: 'part', label: 'Parte' },
];

export const CONFIDENCE_LABEL: Record<ImportDivision['confidence'], string> = {
  high: 'Certeza',
  medium: 'Provável',
  low: 'Talvez',
};

const CHAPTER_KINDS = new Set<string>(['chapter', 'unnumbered']);

/** Um item editável do sumário: o título começa com o do texto quando os dois casaram (o texto é a versão final). */
export function editableOutline(structure: ImportStructure): OutlineItem[] {
  const byIndex = new Map(structure.divisions.map((d) => [d.index, d]));
  return (structure.outline?.items ?? []).map((item) => ({
    ...item,
    title: item.match >= 0 && CHAPTER_KINDS.has(item.kind) ? (byIndex.get(item.match)?.title ?? item.title) : item.title,
  }));
}

/** Quantos capítulos a importação vai criar, com ou sem o sumário como esqueleto. */
export function chapterCount(divisions: ImportDivision[], outline: OutlineItem[], useOutline: boolean): number {
  const textChapters = divisions.filter((d) => CHAPTER_KINDS.has(d.kind));
  if (!useOutline || outline.length === 0) {
    return textChapters.length;
  }
  const matched = new Set(outline.filter((i) => CHAPTER_KINDS.has(i.kind) && i.match >= 0).map((i) => i.match));
  const fromOutline = outline.filter((i) => CHAPTER_KINDS.has(i.kind) && i.title.trim()).length;
  return fromOutline + textChapters.filter((d) => !matched.has(d.index)).length;
}

/** Capítulos do sumário que ainda não têm texto (vão nascer vazios). */
export function emptyChapters(outline: OutlineItem[]): number {
  return outline.filter((i) => CHAPTER_KINDS.has(i.kind) && i.match < 0).length;
}

/** O pedido para a API com o que o escritor aprovou. */
export function toRequest(divisions: ImportDivision[], outline: OutlineItem[], useOutline: boolean): StructureRequest {
  return {
    divisions: divisions.map((d) => ({ index: d.index, kind: d.kind, title: d.title.trim() })),
    useOutline: useOutline && outline.length > 0,
    outline: useOutline ? outline.map((i) => ({ kind: i.kind, title: i.title.trim(), match: i.match })) : [],
  };
}
