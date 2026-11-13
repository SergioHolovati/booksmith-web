import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { firstValueFrom } from 'rxjs';

import { InviteApi } from '../../../core/api/invite.api';
import { problemMessage } from '../../../core/api/problem';
import { InviteView } from '../../../core/models/api.models';

/** O link que o convidado recebe: abre o cadastro com o código preenchido. */
export function inviteLink(code: string, origin: string = window.location.origin): string {
  return `${origin}/register?convite=${encodeURIComponent(code)}`;
}

/** A mensagem pronta para mandar ao convidado. */
export function inviteMessage(code: string, origin?: string): string {
  return `Você foi convidado para o beta do Booksmith, o app para escrever seu livro. `
    + `Crie sua conta por este link: ${inviteLink(code, origin)} (código ${code}).`;
}

/** "3 de 5 usos", "esgotado", "cancelado ou vencido". */
export function inviteState(invite: InviteView, now = new Date()): string {
  if (invite.usedCount >= invite.maxUses) {
    return 'esgotado';
  }
  if (invite.expiresAt && new Date(invite.expiresAt) <= now) {
    return 'cancelado ou vencido';
  }
  return invite.maxUses === 1 ? 'não usado' : `${invite.usedCount} de ${invite.maxUses} usos`;
}

/**
 * Convites do beta (`/convites`, só administradores): criar códigos (um ou vários, com uma anotação de para quem é),
 * copiar a mensagem com o link e cancelar.
 */
@Component({
  selector: 'app-invites',
  imports: [FormsModule, RouterLink, ButtonModule, InputTextModule, MessageModule],
  templateUrl: './invites.html',
  styleUrl: './invites.scss',
})
export class InvitesComponent {
  private readonly api = inject(InviteApi);
  private readonly toast = inject(MessageService);

  readonly invites = signal<InviteView[] | null>(null);
  readonly error = signal<string | null>(null);
  readonly saving = signal(false);
  readonly state = inviteState;
  readonly activeCount = computed(() => (this.invites() ?? []).filter((i) => i.active).length);
  readonly joined = computed(() => (this.invites() ?? []).reduce((total, i) => total + i.usedCount, 0));

  count = 1;
  maxUses = 1;
  note = '';
  expiresInDays: number | null = 30;

  constructor() {
    void this.load();
  }

  async load(): Promise<void> {
    try {
      this.invites.set(await firstValueFrom(this.api.list()));
      this.error.set(null);
    } catch (error) {
      this.error.set(problemMessage(error, 'Não foi possível carregar os convites.'));
    }
  }

  async create(): Promise<void> {
    this.saving.set(true);
    this.error.set(null);
    try {
      const created = await firstValueFrom(this.api.create({
        count: Number(this.count),
        maxUses: Number(this.maxUses),
        note: this.note.trim() || null,
        expiresInDays: this.expiresInDays ? Number(this.expiresInDays) : null,
      }));
      this.toast.add({ severity: 'success', summary: created.length === 1 ? 'Convite criado' : `${created.length} convites criados` });
      this.note = '';
      await this.load();
    } catch (error) {
      this.error.set(problemMessage(error, 'Não foi possível criar os convites.'));
    } finally {
      this.saving.set(false);
    }
  }

  async copy(invite: InviteView): Promise<void> {
    const text = inviteMessage(invite.code);
    try {
      if (navigator.share) {
        await navigator.share({ text });
        return;
      }
    } catch {
      // compartilhamento cancelado: copia
    }
    await navigator.clipboard?.writeText(text);
    this.toast.add({ severity: 'success', summary: 'Mensagem copiada', detail: 'Cole no WhatsApp ou no e-mail.' });
  }

  async revoke(invite: InviteView): Promise<void> {
    try {
      await firstValueFrom(this.api.revoke(invite.id));
      await this.load();
    } catch (error) {
      this.error.set(problemMessage(error, 'Não foi possível cancelar o convite.'));
    }
  }
}
