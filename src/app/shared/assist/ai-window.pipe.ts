import { Pipe, PipeTransform } from '@angular/core';

/** A janela dos usos de IA, pelo plano: 24 horas nos planos pagos, 7 dias no Grátis. */
export function aiWindow(hours: number | null | undefined, form: 'nas' | 'das'): string {
  const week = (hours ?? 24) >= 168;
  if (form === 'nas') {
    return week ? 'nos últimos 7 dias' : 'nas últimas 24 horas';
  }
  return week ? 'dos últimos 7 dias' : 'das últimas 24 horas';
}

/** `{{ status.windowHours | aiWindow: 'nas' }}` → "nas últimas 24 horas" ou "nos últimos 7 dias". */
@Pipe({ name: 'aiWindow' })
export class AiWindowPipe implements PipeTransform {
  transform(hours: number | null | undefined, form: 'nas' | 'das' = 'nas'): string {
    return aiWindow(hours, form);
  }
}
