import { Component, computed, input } from '@angular/core';

import { PrintPageCheck } from '../../core/models/api.models';

/**
 * A conferência do livro ilustrado para a gráfica: as páginas que o miolo tem e o que falta (créditos, ficha
 * catalográfica, ISBN, sobre o autor…), o total de páginas, a sangria e a resolução das ilustrações.
 */
@Component({
  selector: 'app-print-checklist',
  template: `
    @if (items().length) {
      <section class="checklist" aria-label="Conferência para a gráfica" data-print-checklist>
        <p class="summary">
          <strong>Conferência para a gráfica</strong>
          <span class="muted small">{{ pageCount() }} páginas · {{ warnings() ? warnings() + (warnings() === 1 ? ' pendência' : ' pendências') : 'tudo certo' }}</span>
        </p>
        <ul>
          @for (item of items(); track item.key) {
            <li [class]="item.status" [attr.data-check]="item.key">
              <i class="pi" [class]="'pi ' + icon(item.status)" aria-hidden="true"></i>
              <span><strong>{{ item.label }}</strong> {{ item.detail }}</span>
            </li>
          }
        </ul>
      </section>
    }
  `,
  styles: `
    .checklist { padding: .8rem 1rem; border: 1px solid var(--bs-border); border-radius: 12px;
      background: var(--bs-surface); }
    .summary { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: .4rem;
      margin: 0 0 .5rem; }
    ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: .35rem; }
    li { display: flex; gap: .5rem; align-items: flex-start; font-size: .85rem; line-height: 1.35; }
    li .pi { margin-top: .15rem; }
    li.ok .pi { color: #5bbf7a; }
    li.warn .pi { color: #e0a24a; }
    li.info .pi { color: var(--bs-text-soft); }
  `,
})
export class PrintChecklistComponent {
  readonly items = input<PrintPageCheck[]>([]);
  readonly pageCount = input(0);
  readonly warnings = computed(() => this.items().filter((item) => item.status === 'warn').length);

  icon(status: PrintPageCheck['status']): string {
    return status === 'ok' ? 'pi-check-circle' : status === 'warn' ? 'pi-exclamation-triangle' : 'pi-info-circle';
  }
}
