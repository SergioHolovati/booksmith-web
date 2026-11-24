import { Component, computed, inject, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { firstValueFrom } from 'rxjs';

import { MonitoringApi, MonitoringReport, RouteStat } from '../../../core/api/monitoring.api';
import { problemMessage } from '../../../core/api/problem';

/** O que cada alerta de segurança quer dizer (mesmos tipos do `SecurityIncident` da API). */
export const INCIDENT_LABEL: Record<string, string> = {
  LOGIN_LOCKED: 'Contas bloqueadas por senha errada',
  RATE_LIMITED: 'Requisições barradas pelo limite por IP',
  MFA_FAILED: 'Verificações em duas etapas com códigos errados demais',
  SERVER_ERROR: 'Erros 500 na API',
  QUOTA_HIT: 'Limites diários de PDF atingidos',
  IMAGE_FLAGGED: 'Imagens enviadas para revisão',
  IMAGE_BLOCKED: 'Imagens recusadas pela moderação',
  FILE_INFECTED: 'Arquivos recusados pelo antivírus',
};

export const PERIODS = [1, 24, 48] as const;

export type RouteOrder = 'requests' | 'slowest' | 'errors';

const NUMBER = new Intl.NumberFormat('pt-BR');

export function formatCount(value: number): string {
  return NUMBER.format(value);
}

/** "14h" (horário de quem olha). */
export function hourLabel(iso: string): string {
  return `${new Date(iso).getHours()}h`;
}

/** Altura de cada barra em % da maior (no mínimo um traço quando houve alguma requisição). */
export function barHeights(values: number[]): number[] {
  const max = Math.max(0, ...values);
  return values.map((v) => (max === 0 || v === 0 ? 0 : Math.max(3, Math.round((v / max) * 100))));
}

/** Percentual de respostas com erro (4xx e 5xx) numa rota. */
export function errorRate(route: RouteStat): number {
  return route.requests === 0 ? 0 : Math.round((route.errors / route.requests) * 100);
}

export function sortRoutes(routes: RouteStat[], order: RouteOrder): RouteStat[] {
  const key: (r: RouteStat) => number = order === 'slowest'
    ? (r) => r.averageMillis
    : order === 'errors' ? (r) => r.errors : (r) => r.requests;
  return [...routes].sort((a, b) => key(b) - key(a)).slice(0, 15);
}

/** Os alertas que aconteceram no período, do mais frequente ao menos. */
export function incidentList(incidents: Record<string, number>): { kind: string; label: string; count: number }[] {
  return Object.entries(incidents)
    .filter(([, count]) => count > 0)
    .map(([kind, count]) => ({ kind, label: INCIDENT_LABEL[kind] ?? kind, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Monitoramento (`/backoffice/monitoramento`): quanto o app está sendo usado e o que parece ataque, nas últimas
 * horas. Os números vêm da API, guardados por 48 horas.
 */
@Component({
  selector: 'app-monitoring',
  imports: [ButtonModule, MessageModule],
  templateUrl: './monitoring.html',
  styleUrl: './monitoring.scss',
})
export class MonitoringComponent {
  private readonly api = inject(MonitoringApi);

  readonly periods = PERIODS;
  readonly hours = signal<number>(24);
  readonly report = signal<MonitoringReport | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly selected = signal<number | null>(null);
  readonly routeOrder = signal<RouteOrder>('requests');
  readonly formatCount = formatCount;
  readonly hourLabel = hourLabel;
  readonly errorRate = errorRate;

  readonly heights = computed(() => barHeights((this.report()?.series ?? []).map((p) => p.requests)));
  readonly selectedPoint = computed(() => {
    const index = this.selected();
    return index === null ? null : (this.report()?.series[index] ?? null);
  });
  readonly routes = computed(() => sortRoutes(this.report()?.routes ?? [], this.routeOrder()));
  readonly incidents = computed(() => incidentList(this.report()?.incidents ?? {}));
  readonly suspicious = computed(() => (this.report()?.addresses ?? []).filter((a) => a.suspicious > 0));

  constructor() {
    queueMicrotask(() => void this.load());
  }

  setHours(hours: number): void {
    this.hours.set(hours);
    this.selected.set(null);
    void this.load();
  }

  select(index: number): void {
    this.selected.set(this.selected() === index ? null : index);
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.report.set(await firstValueFrom(this.api.report(this.hours())));
    } catch (error) {
      this.error.set(problemMessage(error, 'Não foi possível carregar o monitoramento.'));
    } finally {
      this.loading.set(false);
    }
  }
}
