import { Component, input, output } from '@angular/core';

import { PlacedIssue } from './proofread';

/**
 * Sugestões do corretor para o erro tocado: aplicar uma sugestão, ignorar ou (ortografia) adicionar ao dicionário
 * do livro. Fica logo acima da barra de formatação, ao alcance do polegar.
 */
@Component({
  selector: 'app-proofread-panel',
  templateUrl: './proofread-panel.html',
  styleUrl: './proofread-panel.scss',
})
export class ProofreadPanelComponent {
  readonly issue = input.required<PlacedIssue>();
  readonly apply = output<string>();
  readonly ignore = output<void>();
  readonly addToDictionary = output<void>();
  readonly dismiss = output<void>();
}
