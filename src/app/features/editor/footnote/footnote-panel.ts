import { Component, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { MAX_FOOTNOTE } from '../schema/footnote';

/** Escrever uma nota de rodapé nova, ou editar e tirar a que foi tocada no texto. */
@Component({
  selector: 'app-footnote-panel',
  imports: [FormsModule],
  template: `
    <section class="fn-panel" role="dialog" aria-label="Nota de rodapé" data-footnote-panel>
      <label for="fn-text" class="fn-label">{{ editing() ? 'Nota de rodapé' : 'Nova nota de rodapé' }}</label>
      <textarea id="fn-text" class="fn-input" rows="3" [maxlength]="max" [ngModel]="draft()"
        (ngModelChange)="draft.set($event)" placeholder="Ex.: Mateus 6:9, na versão Almeida Revista e Atualizada."></textarea>
      <div class="fn-actions">
        <button type="button" class="fn-link" [disabled]="!draft().trim()" (click)="save()" data-footnote-save>
          {{ editing() ? 'Salvar nota' : 'Inserir nota' }}</button>
        @if (editing()) {
          <button type="button" class="fn-link danger" (click)="remove.emit()">Tirar a nota</button>
        }
        <button type="button" class="fn-link muted" (click)="closed.emit()">Fechar</button>
      </div>
    </section>
  `,
  styles: `
    .fn-panel { position: fixed; left: 50%; bottom: calc(var(--keyboard-offset, 0px) + 64px + var(--bs-safe-bottom));
      z-index: 30; width: min(560px, calc(100vw - 16px)); transform: translateX(-50%); padding: .75rem;
      border: 1px solid var(--bs-border); border-radius: var(--bs-radius); background: var(--bs-bg-elevated);
      box-shadow: var(--bs-shadow); display: flex; flex-direction: column; gap: .4rem; }
    .fn-label { font-size: .75rem; text-transform: uppercase; letter-spacing: .06em; color: var(--bs-muted); }
    .fn-input { padding: .5rem .7rem; border: 1px solid var(--bs-border); border-radius: var(--bs-radius-sm);
      background: var(--bs-surface); color: var(--bs-text); font: inherit; resize: vertical; }
    .fn-actions { display: flex; flex-wrap: wrap; gap: .25rem 1rem; }
    .fn-link { min-height: var(--bs-touch); padding: 0; border: 0; background: none; color: var(--bs-ember);
      font: inherit; cursor: pointer; }
    .fn-link:disabled { opacity: .4; cursor: default; }
    .fn-link.danger { color: var(--bs-danger); }
    .fn-link.muted { color: var(--bs-muted); }
  `,
})
export class FootnotePanelComponent {
  /** O texto da nota tocada; null = nota nova. */
  readonly text = input<string | null>(null);
  readonly saved = output<string>();
  readonly remove = output<void>();
  readonly closed = output<void>();

  readonly max = MAX_FOOTNOTE;
  readonly draft = signal('');
  readonly editing = signal(false);

  constructor() {
    effect(() => {
      const text = this.text();
      this.editing.set(text !== null);
      this.draft.set(text ?? '');
    });
  }

  save(): void {
    if (this.draft().trim()) {
      this.saved.emit(this.draft().trim());
    }
  }
}
