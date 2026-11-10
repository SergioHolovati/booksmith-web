import { Component, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

/** Legenda e remoção da ilustração selecionada no texto (o toque na imagem a seleciona). */
@Component({
  selector: 'app-illustration-panel',
  imports: [FormsModule],
  template: `
    <section class="ill-panel" role="dialog" aria-label="Ilustração selecionada">
      <label for="ill-caption" class="ill-label">Legenda</label>
      <input id="ill-caption" class="ill-input" [ngModel]="draft()" (ngModelChange)="draft.set($event)" maxlength="300"
        placeholder="Ex.: O mapa de Vel (opcional)" (keydown.enter)="save()" (blur)="save()" />
      <div class="ill-actions">
        <button type="button" class="ill-link" (click)="save()">Salvar legenda</button>
        <button type="button" class="ill-link danger" (click)="remove.emit()">Tirar do texto</button>
      </div>
    </section>
  `,
  styles: `
    .ill-panel { position: fixed; left: 50%; bottom: calc(var(--keyboard-offset, 0px) + 64px + var(--bs-safe-bottom));
      z-index: 30; width: min(560px, calc(100vw - 16px)); transform: translateX(-50%); padding: .75rem;
      border: 1px solid var(--bs-border); border-radius: var(--bs-radius); background: var(--bs-bg-elevated);
      box-shadow: var(--bs-shadow); display: flex; flex-direction: column; gap: .4rem; }
    .ill-label { font-size: .75rem; text-transform: uppercase; letter-spacing: .06em; color: var(--bs-muted); }
    .ill-input { min-height: var(--bs-touch); padding: .4rem .7rem; border: 1px solid var(--bs-border);
      border-radius: var(--bs-radius-sm); background: var(--bs-surface); color: var(--bs-text); font: inherit; }
    .ill-actions { display: flex; flex-wrap: wrap; gap: .25rem 1rem; }
    .ill-link { min-height: var(--bs-touch); padding: 0; border: 0; background: none; color: var(--bs-ember);
      font: inherit; cursor: pointer; }
    .ill-link.danger { color: var(--bs-danger); }
  `,
})
export class IllustrationPanelComponent {
  readonly caption = input<string | null>(null);
  readonly captionChange = output<string>();
  readonly remove = output<void>();

  readonly draft = signal('');

  constructor() {
    effect(() => this.draft.set(this.caption() ?? ''));
  }

  save(): void {
    if (this.draft().trim() !== (this.caption() ?? '')) {
      this.captionChange.emit(this.draft().trim());
    }
  }
}
