import { Injectable, inject } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { MessageService } from 'primeng/api';
import { filter } from 'rxjs';

/** Até quanto tempo depois de abrir o app a versão nova entra na hora (a pessoa ainda não começou nada). */
export const APPLY_AT_START_MS = 15_000;

/**
 * Decide se a versão nova entra agora: logo ao abrir o app, ou com ele em segundo plano (ninguém está olhando, e o
 * texto já fica salvo no aparelho). Fora disso, espera a pessoa sair do app.
 */
export function applyNow(startedAt: number, now: number, hidden: boolean): boolean {
  return hidden || now - startedAt <= APPLY_AT_START_MS;
}

/**
 * Atualização do app instalado (PWA). Sem isto, o celular continuava na versão guardada até o app ser fechado por
 * completo, e uma versão com defeito (ícones sumidos, por exemplo) ficava presa no aparelho. Agora: procura versão
 * nova ao abrir e ao voltar para o app; aplica na hora se for seguro, senão na próxima vez que o app for para o
 * segundo plano; e recarrega se a versão guardada estiver corrompida.
 */
@Injectable({ providedIn: 'root' })
export class AppUpdates {
  private readonly updates = inject(SwUpdate);
  private readonly toast = inject(MessageService);
  private readonly startedAt = Date.now();
  private pending = false;

  constructor() {
    if (!this.updates.isEnabled) {
      return;
    }
    this.updates.versionUpdates
      .pipe(filter((event): event is VersionReadyEvent => event.type === 'VERSION_READY'))
      .subscribe(() => {
        if (applyNow(this.startedAt, Date.now(), document.hidden)) {
          void this.apply();
        } else {
          this.pending = true;
          this.toast.add({
            severity: 'info',
            summary: 'Nova versão do Booksmith',
            detail: 'Ela entra quando você sair do app e voltar. Seu texto fica salvo.',
            life: 6000,
          });
        }
      });
    this.updates.unrecoverable.subscribe(() => document.location.reload());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.pending) {
        void this.apply();
      } else if (!document.hidden) {
        void this.updates.checkForUpdate().catch(() => undefined);
      }
    });
  }

  private async apply(): Promise<void> {
    this.pending = false;
    try {
      await this.updates.activateUpdate();
    } finally {
      document.location.reload();
    }
  }
}
