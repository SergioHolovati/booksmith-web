import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

/** Uso da API e sinais de ataque nas últimas horas (backoffice, só administradores). */
export interface MonitoringReport {
  hours: number;
  totals: {
    requests: number;
    /** Respostas 4xx (fora o 429). */
    clientErrors: number;
    /** Barradas pelo limite por IP (429). */
    limited: number;
    /** Erros 5xx. */
    serverErrors: number;
    averageMillis: number;
    activeUsers: number;
    addresses: number;
  };
  /** Uma por hora, da mais antiga para a atual. */
  series: { hour: string; requests: number; clientErrors: number; limited: number; serverErrors: number }[];
  routes: RouteStat[];
  /** IPs com mais respostas suspeitas (401, 403, 429, 404 sem rota) e, depois, com mais requisições. */
  addresses: { ip: string; requests: number; suspicious: number }[];
  users: { id: string | null; email: string | null; requests: number }[];
  /** Caminhos que não existem na API, mais tentados (varredura atrás de falhas). */
  probes: { name: string; count: number }[];
  /** Tipo do alerta de segurança → ocorrências. */
  incidents: Record<string, number>;
}

export interface RouteStat {
  route: string;
  requests: number;
  errors: number;
  averageMillis: number;
}

@Injectable({ providedIn: 'root' })
export class MonitoringApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/admin/monitoring`;

  report(hours: number): Observable<MonitoringReport> {
    return this.http.get<MonitoringReport>(this.base, { params: new HttpParams().set('hours', hours) });
  }
}
