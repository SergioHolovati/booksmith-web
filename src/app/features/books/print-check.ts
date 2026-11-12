import { PrintCheckIllustration } from '../../core/models/api.models';

/** Quantas ilustrações aparecem pelo nome no aviso; o resto vira "e mais N". */
export const LISTED = 3;

/** As que não saem bem na impressão: abaixo de 300 DPI ou fora do PDF (WebP). */
export function blurry(illustrations: PrintCheckIllustration[]): PrintCheckIllustration[] {
  return illustrations.filter((i) => !i.ok);
}

/** "O mapa de Vel" (capítulo O mapa); sem legenda, só o capítulo. */
export function illustrationName(item: PrintCheckIllustration): string {
  return item.caption ? `"${item.caption}" (${item.chapter})` : `a ilustração de ${item.chapter}`;
}

/** O que fazer com uma ilustração que não sai bem. */
export function illustrationProblem(item: PrintCheckIllustration): string {
  if (!item.printable) {
    return `${illustrationName(item)} está em WebP e não entra no PDF: troque por JPEG ou PNG.`;
  }
  return `${illustrationName(item)} sai com ${item.dpi} DPI; para 300, use uma imagem com pelo menos `
    + `${item.minWidthPx.toLocaleString('pt-BR')} px de largura.`;
}

/** O resumo do aviso: quantas saem borradas, as primeiras pelo nome. null = todas boas (ou nenhuma). */
export function printCheckSummary(illustrations: PrintCheckIllustration[]): string | null {
  const bad = blurry(illustrations);
  if (!bad.length) {
    return null;
  }
  const head = bad.length === 1
    ? '1 ilustração pode sair borrada na impressão (gráficas pedem 300 DPI).'
    : `${bad.length} de ${illustrations.length} ilustrações podem sair borradas na impressão (gráficas pedem 300 DPI).`;
  const listed = bad.slice(0, LISTED).map(illustrationProblem);
  const more = bad.length > LISTED ? [`E mais ${bad.length - LISTED}.`] : [];
  return [head, ...listed, ...more].join(' ');
}
