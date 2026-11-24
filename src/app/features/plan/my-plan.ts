import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { firstValueFrom } from 'rxjs';

import { MyPlan, PlanApi, PlanLimits } from '../../core/api/plan.api';
import { problemMessage } from '../../core/api/problem';

/** Os preços (os mesmos do plano de produto); a cobrança é feita fora do app por enquanto. */
export const PRICES: Record<string, { month: string; year: string | null }> = {
  GRATIS: { month: 'R$ 0', year: null },
  ESCRITOR: { month: 'R$ 24,90/mês', year: 'ou R$ 199/ano' },
  AUTOR: { month: 'R$ 49,90/mês', year: 'ou R$ 399/ano' },
};

/** As linhas da comparação: o nome e como mostrar o valor de cada plano. */
export const ROWS: { label: string; value: (l: PlanLimits) => string }[] = [
  { label: 'Livros', value: (l) => count(l.books) },
  { label: 'Universos', value: (l) => count(l.universes) },
  { label: 'Personagens por universo', value: (l) => count(l.charactersPerUniverse) },
  { label: 'Usos de IA (revisão, ideias, perguntas)', value: (l) => `${l.aiUses} ${l.aiWindowHours >= 168 ? 'por semana' : 'por dia'}` },
  { label: 'Ilustrações com IA', value: (l) => (l.illustrationsPerWeek === 0 ? '—' : `${l.illustrationsPerWeek} por semana`) },
  { label: 'ePub', value: (l) => (l.epub ? 'Sim' : '—') },
  { label: 'PDF e capa para gráfica', value: (l) => (l.print ? 'Sim' : '—') },
];

export function count(value: number): string {
  return value < 0 ? 'Ilimitados' : String(value);
}

/** "Fundador", "Cortesia" ou nada (o plano padrão). */
export function sourceLabel(plan: MyPlan): string | null {
  if (plan.founder) {
    return 'Fundador';
  }
  return plan.source === 'courtesy' ? 'Cortesia' : null;
}

/**
 * Meu plano (`/plano`): o plano da conta, até quando vale e a comparação dos três. Cancelar nunca apaga nada: quem
 * volta ao Grátis continua lendo e exportando tudo o que já fez.
 */
@Component({
  selector: 'app-my-plan',
  imports: [DatePipe, RouterLink, ButtonModule, ProgressSpinnerModule],
  template: `
    <div class="page narrow">
      <a routerLink="/profile" class="back-link"><i class="pi pi-arrow-left"></i> Perfil</a>
      <div class="page-header">
        <div>
          <h1 class="page-title">Meu plano</h1>
          <p class="page-subtitle">O que a sua conta libera. Nada do que você escreveu some se o plano mudar.</p>
        </div>
      </div>

      @if (plan(); as p) {
        <section class="glass-card current" data-my-plan [attr.data-plan]="p.plan">
          <span class="muted small">Seu plano</span>
          <strong class="plan-name">{{ p.label }}
            @if (source(); as s) { <span class="badge" data-plan-source>{{ s }}</span> }
          </strong>
          @if (p.expiresAt) {
            <span class="small">Vale até {{ p.expiresAt | date: 'dd/MM/yyyy' }}</span>
          }
        </section>

        <div class="compare" role="table" aria-label="Comparação dos planos">
          <div class="row head" role="row">
            <span role="columnheader"></span>
            @for (option of p.plans; track option.plan) {
              <span role="columnheader" [class.mine]="option.plan === p.plan">
                <strong>{{ option.label }}</strong>
                <small class="muted">{{ prices[option.plan].month }}</small>
                @if (prices[option.plan].year; as year) { <small class="muted year">{{ year }}</small> }
              </span>
            }
          </div>
          @for (row of rows; track row.label) {
            <div class="row" role="row">
              <span role="rowheader" class="small">{{ row.label }}</span>
              @for (option of p.plans; track option.plan) {
                <span role="cell" class="small" [class.mine]="option.plan === p.plan">{{ row.value(option.limits) }}</span>
              }
            </div>
          }
        </div>

        @if (p.plansUrl) {
          <a class="subscribe" [href]="p.plansUrl" target="_blank" rel="noopener" data-plans-url>
            <p-button label="Ver planos e assinar" icon="pi pi-star" styleClass="full-width" />
          </a>
        } @else {
          <p class="muted small">A assinatura abre em breve. Dúvidas? <a routerLink="/ajuda/contato">Fale com o suporte</a>.</p>
        }
      } @else if (error(); as message) {
        <p class="muted">{{ message }}</p>
      } @else {
        <div class="center"><p-progress-spinner strokeWidth="4" /></div>
      }
    </div>
  `,
  styles: `
    .current { display: flex; flex-direction: column; gap: .2rem; padding: 1rem; margin-bottom: 1rem; }
    .plan-name { font-size: 1.4rem; display: flex; align-items: center; gap: .5rem; flex-wrap: wrap; }
    .badge { font-size: .75rem; padding: .1rem .55rem; border: 1px solid var(--bs-accent); border-radius: 999px; }
    .compare { display: flex; flex-direction: column; margin-bottom: 1rem; overflow-x: auto; }
    .row { display: grid; grid-template-columns: minmax(7rem, 1.4fr) repeat(3, minmax(4.5rem, 1fr)); gap: .4rem;
      padding: .5rem 0; border-bottom: 1px solid var(--bs-border); align-items: center; }
    .row.head span { display: flex; flex-direction: column; gap: .1rem; }
    .year { font-size: .7rem; }
    .mine { color: var(--bs-text); font-weight: 600; }
    .row span:not(.mine) { color: var(--bs-text-soft); }
    .subscribe { display: block; text-decoration: none; }
    .center { display: flex; justify-content: center; }
  `,
})
export class MyPlanComponent {
  private readonly api = inject(PlanApi);

  readonly plan = signal<MyPlan | null>(null);
  readonly error = signal<string | null>(null);
  readonly rows = ROWS;
  readonly prices = PRICES;
  readonly source = computed(() => {
    const p = this.plan();
    return p ? sourceLabel(p) : null;
  });

  constructor() {
    queueMicrotask(() => void this.load());
  }

  async load(): Promise<void> {
    try {
      this.plan.set(await firstValueFrom(this.api.mine()));
    } catch (error) {
      this.error.set(problemMessage(error, 'Não foi possível carregar o seu plano.'));
    }
  }
}
