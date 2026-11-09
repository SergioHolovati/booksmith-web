import { Component, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { firstValueFrom } from 'rxjs';

import { ContinuityApi } from '../../core/api/continuity.api';
import { problemMessage } from '../../core/api/problem';
import { AlertStatus, ContinuityAlert, ContinuityOverview } from '../../core/models/api.models';
import { since } from '../../core/util/relative-time';

/** Trecho de citação: texto normal ou a parte destacada. */
export interface QuotePart {
  text: string;
  mark: boolean;
}

/** Divide a citação em volta da primeira ocorrência do destaque (sem diferenciar maiúsculas). */
export function quoteParts(quote: string, highlight: string): QuotePart[] {
  const index = highlight ? quote.toLocaleLowerCase('pt-BR').indexOf(highlight.toLocaleLowerCase('pt-BR')) : -1;
  if (index < 0) {
    return [{ text: quote, mark: false }];
  }
  return [
    { text: quote.slice(0, index), mark: false },
    { text: quote.slice(index, index + highlight.length), mark: true },
    { text: quote.slice(index + highlight.length), mark: false },
  ].filter((part) => part.text !== '');
}

/**
 * Continuidade do livro: análise sob demanda e os alertas abertos, cada um com os trechos e o caminho até o
 * parágrafo no editor. O autor decide: corrigir no texto (o alerta some na próxima análise), ignorar ou
 * marcar como intencional.
 */
@Component({
  selector: 'app-continuity',
  imports: [RouterLink, ButtonModule, ProgressSpinnerModule],
  templateUrl: './continuity.html',
  styleUrl: './continuity.scss',
})
export class ContinuityComponent {
  private readonly api = inject(ContinuityApi);
  private readonly toast = inject(MessageService);

  readonly bookId = input.required<string>();

  readonly overview = signal<ContinuityOverview | null>(null);
  readonly loading = signal(true);
  readonly analyzing = signal(false);
  readonly error = signal<string | null>(null);
  readonly deciding = signal<string | null>(null);
  readonly quoteParts = quoteParts;

  constructor() {
    queueMicrotask(() => void this.load());
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.overview.set(await firstValueFrom(this.api.overview(this.bookId())));
    } catch (error) {
      this.error.set(problemMessage(error, 'Não foi possível abrir a continuidade.'));
    } finally {
      this.loading.set(false);
    }
  }

  async analyze(): Promise<void> {
    this.analyzing.set(true);
    try {
      const result = await firstValueFrom(this.api.analyze(this.bookId()));
      this.overview.set(result);
      this.toast.add({ severity: 'success', summary: 'Livro analisado', detail: this.summary(result), life: 4000 });
    } catch (error) {
      this.toast.add({ severity: 'error', summary: problemMessage(error) });
    } finally {
      this.analyzing.set(false);
    }
  }

  async decide(alert: ContinuityAlert, status: AlertStatus): Promise<void> {
    this.deciding.set(alert.id);
    try {
      await firstValueFrom(this.api.setStatus(alert.id, status));
      this.overview.update((o) => (o ? { ...o, alerts: o.alerts.filter((a) => a.id !== alert.id) } : o));
      this.toast.add({
        severity: 'success',
        summary: status === 'intentional' ? 'Marcado como intencional' : 'Alerta ignorado',
        detail: 'Ele não volta nas próximas análises.',
        life: 3000,
      });
    } catch (error) {
      this.toast.add({ severity: 'error', summary: problemMessage(error) });
    } finally {
      this.deciding.set(null);
    }
  }

  analyzedAgo(): string {
    const at = this.overview()?.lastAnalysis?.analyzedAt;
    return at ? since(new Date(at)) : '';
  }

  private summary(result: ContinuityOverview): string {
    const open = result.alerts.length;
    const parts = [open === 0 ? 'Nenhum alerta aberto' : open === 1 ? '1 alerta aberto' : `${open} alertas abertos`];
    if (result.fixed) {
      parts.push(result.fixed === 1 ? '1 corrigido' : `${result.fixed} corrigidos`);
    }
    return parts.join(' · ') + '.';
  }
}
