import { Component, computed, inject, input, signal } from '@angular/core';

import { AssistApi } from '../../../core/api/assist.api';
import { PlotField } from '../../../core/models/api.models';
import { AiSuggestComponent } from '../../../shared/assist/ai-suggest';

/** Partes do enredo que o autor pode pedir, na ordem do cartão. */
export const PLOT_FIELDS: { value: PlotField; label: string }[] = [
  { value: 'next', label: 'O que pode vir depois' },
  { value: 'conflict', label: 'Conflitos' },
  { value: 'twist', label: 'Reviravoltas' },
  { value: 'subplot', label: 'Tramas paralelas' },
  { value: 'ending', label: 'Caminhos para o final' },
];

/**
 * "Ideias para o enredo" na página do livro: a IA lê a sinopse, os títulos dos capítulos e o fim do capítulo
 * mais recente, e sugere caminhos ou faz perguntas. Quem decide o rumo da história é o autor; aqui só dá para
 * copiar a ideia, nada vai para o texto.
 */
@Component({
  selector: 'app-plot-ideas',
  imports: [AiSuggestComponent],
  template: `
    @if (enabled()) {
      <section class="glass-card plot-ideas" aria-labelledby="plot-ideas-title">
        <button type="button" class="plot-head" [attr.aria-expanded]="open()" (click)="open.set(!open())">
          <i class="pi pi-lightbulb" aria-hidden="true"></i>
          <span class="plot-text">
            <strong id="plot-ideas-title">Ideias para o enredo</strong>
            <small class="muted">A IA sugere caminhos; a história continua sendo sua</small>
          </span>
          <i class="pi muted" [class.pi-chevron-down]="!open()" [class.pi-chevron-up]="open()" aria-hidden="true"></i>
        </button>
        @if (open()) {
          <div class="plot-body">
            <div class="plot-fields" role="group" aria-label="Sobre o quê">
              @for (f of fields; track f.value) {
                <button type="button" class="chip" [class.on]="field() === f.value"
                  [attr.aria-pressed]="field() === f.value" (click)="field.set(f.value)">{{ f.label }}</button>
              }
            </div>
            @for (f of [field()]; track f) {
              <app-ai-suggest kind="plot" [field]="f" [fieldLabel]="label()" [bookId]="bookId()"
                [appendable]="false" [startOpen]="true" />
            }
          </div>
        }
      </section>
    }
  `,
  styles: `
    .plot-ideas {
      padding: 0;
      overflow: hidden;
    }
    .plot-head {
      display: flex;
      align-items: center;
      gap: .85rem;
      width: 100%;
      min-height: 64px;
      padding: .85rem 1rem;
      border: none;
      background: none;
      color: var(--bs-text);
      font: inherit;
      text-align: left;
      cursor: pointer;
    }
    .plot-head > .pi-lightbulb {
      color: var(--bs-accent-light);
      font-size: 1.1rem;
    }
    .plot-text {
      display: flex;
      flex: 1;
      flex-direction: column;
      gap: .15rem;
      min-width: 0;
    }
    .plot-body {
      display: flex;
      flex-direction: column;
      gap: .6rem;
      padding: 0 1rem 1rem;
    }
    .plot-fields {
      display: flex;
      flex-wrap: wrap;
      gap: .4rem;
    }
    .chip {
      min-height: 40px;
      padding: 0 .85rem;
      border: 1px solid var(--bs-border);
      border-radius: 999px;
      background: var(--bs-surface);
      color: var(--bs-text-soft);
      font: inherit;
      font-size: .85rem;
      cursor: pointer;
    }
    .chip.on {
      border-color: var(--bs-ember);
      background: var(--bs-sand-soft);
      color: var(--bs-text);
    }
  `,
})
export class PlotIdeasComponent {
  private readonly api = inject(AssistApi);

  readonly bookId = input.required<string>();

  readonly fields = PLOT_FIELDS;
  readonly open = signal(false);
  readonly field = signal<PlotField>('next');
  readonly label = computed(() => PLOT_FIELDS.find((f) => f.value === this.field())?.label ?? '');
  readonly enabled = computed(() => this.api.status()?.enabled === true);

  constructor() {
    void this.api.ensureStatus();
  }
}
