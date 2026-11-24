import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

/** O que um plano libera. `-1` = sem limite. */
export interface PlanLimits {
  books: number;
  universes: number;
  charactersPerUniverse: number;
  aiUses: number;
  /** 24 nos planos pagos; 168 (7 dias) no Grátis. */
  aiWindowHours: number;
  illustrationsPerWeek: number;
  epub: boolean;
  print: boolean;
}

export type PlanName = 'GRATIS' | 'ESCRITOR' | 'AUTOR';

export interface MyPlan {
  plan: PlanName;
  label: string;
  /** courtesy (cortesia), founder (fundador) ou asaas; null = o plano padrão. */
  source: string | null;
  founder: boolean;
  /** null = sem prazo. */
  expiresAt: string | null;
  limits: PlanLimits;
  plans: { plan: PlanName; label: string; limits: PlanLimits }[];
  /** Onde ver os planos e assinar (vazio enquanto a venda não abre). */
  plansUrl: string | null;
}

@Injectable({ providedIn: 'root' })
export class PlanApi {
  private readonly http = inject(HttpClient);

  mine(): Observable<MyPlan> {
    return this.http.get<MyPlan>(`${environment.apiBaseUrl}/me/plan`);
  }
}
