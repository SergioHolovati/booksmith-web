import { CanDeactivateFn } from '@angular/router';

/** Tela com edição que só vale depois de "Salvar" (ficha de personagem, por exemplo). */
export interface HasUnsavedChanges {
  hasUnsavedChanges(): boolean;
}

/** Pergunta antes de sair de uma tela com alterações não salvas. */
export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (component) =>
  !component.hasUnsavedChanges() || confirm('Você tem alterações não salvas. Sair mesmo assim?');
