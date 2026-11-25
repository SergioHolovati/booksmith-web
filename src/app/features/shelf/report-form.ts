import { Component, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { firstValueFrom } from 'rxjs';

import { problemMessage } from '../../core/api/problem';
import { ReportReason, ShelfApi } from '../../core/api/shelf.api';
import { REPORT_REASONS, REPORT_REASON_LABEL } from './shelf-labels';

/** Denunciar uma obra ou um comentário: o motivo e, se quiser, os detalhes. Vai para a moderação da equipe. */
@Component({
  selector: 'app-report-form',
  imports: [FormsModule, ButtonModule],
  template: `
    @if (sent()) {
      <p class="small sent" data-report-sent><i class="pi pi-check" aria-hidden="true"></i> Denúncia enviada. A equipe
        vai analisar.</p>
    } @else {
      <form class="report glass-card" (ngSubmit)="send()" data-report-form>
        <fieldset>
          <legend class="small">Por que você está denunciando?</legend>
          @for (r of reasons; track r) {
            <label class="option">
              <input type="radio" name="reason" [value]="r" [(ngModel)]="reason" [attr.data-reason]="r" />
              {{ reasonLabel[r] }}
            </label>
          }
        </fieldset>
        <label class="small" [for]="'details-' + targetId()">Detalhes (opcional)</label>
        <textarea [id]="'details-' + targetId()" name="details" rows="3" maxlength="1000" [(ngModel)]="details"></textarea>
        @if (error(); as text) { <p class="small error">{{ text }}</p> }
        <div class="actions">
          <p-button type="button" label="Cancelar" severity="secondary" [text]="true" size="small" (onClick)="closed.emit()" />
          <p-button type="submit" label="Enviar denúncia" severity="danger" size="small" [disabled]="!reason"
            [loading]="sending()" />
        </div>
      </form>
    }
  `,
  styles: `
    .report { display: flex; flex-direction: column; gap: .5rem; margin-top: .5rem; }
    fieldset { border: 0; margin: 0; padding: 0; display: flex; flex-direction: column; gap: .2rem; }
    legend { margin-bottom: .3rem; }
    .option { display: flex; align-items: center; gap: .5rem; min-height: 36px; font-size: .9rem; }
    textarea { width: 100%; font: inherit; color: var(--bs-text); background: var(--bs-surface);
      border: 1px solid var(--bs-border); border-radius: var(--bs-radius-sm); padding: .5rem; }
    .actions { display: flex; justify-content: flex-end; gap: .4rem; flex-wrap: wrap; }
    .error { color: var(--bs-danger); margin: 0; }
    .sent { color: var(--bs-success); }
  `,
})
export class ReportFormComponent {
  private readonly api = inject(ShelfApi);

  readonly targetType = input.required<'work' | 'comment'>();
  readonly targetId = input.required<string>();
  readonly closed = output<void>();

  readonly reasons = REPORT_REASONS;
  readonly reasonLabel = REPORT_REASON_LABEL;
  reason: ReportReason | null = null;
  details = '';
  readonly sending = signal(false);
  readonly sent = signal(false);
  readonly error = signal<string | null>(null);

  async send(): Promise<void> {
    if (!this.reason) {
      return;
    }
    this.sending.set(true);
    this.error.set(null);
    try {
      await firstValueFrom(this.api.report(this.targetType(), this.targetId(), this.reason, this.details.trim()));
      this.sent.set(true);
    } catch (error) {
      this.error.set(problemMessage(error, 'Não foi possível enviar a denúncia.'));
    } finally {
      this.sending.set(false);
    }
  }
}
