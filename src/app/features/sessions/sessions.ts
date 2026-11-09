import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { firstValueFrom } from 'rxjs';

import { ProfileApi } from '../../core/api/profile.api';
import { problemMessage } from '../../core/api/problem';
import { DeviceSession } from '../../core/models/api.models';
import { since } from '../../core/util/relative-time';

const MOBILE = /Android|iPhone|iPad/;

/** Aparelhos com a conta aberta: desconectar um ou todos os outros (celular perdido, computador emprestado). */
@Component({
  selector: 'app-sessions',
  imports: [RouterLink, ButtonModule, ProgressSpinnerModule],
  templateUrl: './sessions.html',
  styleUrl: './sessions.scss',
})
export class SessionsComponent {
  private readonly api = inject(ProfileApi);
  private readonly toast = inject(MessageService);

  readonly sessions = signal<DeviceSession[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  /** Id da sessão sendo encerrada, ou "others" para todas as outras. */
  readonly ending = signal<string | null>(null);
  readonly others = computed(() => this.sessions().filter((s) => !s.current));

  constructor() {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.sessions.set(await firstValueFrom(this.api.sessions()));
    } catch (error) {
      this.error.set(problemMessage(error, 'Não foi possível carregar os aparelhos.'));
    } finally {
      this.loading.set(false);
    }
  }

  async end(session: DeviceSession): Promise<void> {
    this.ending.set(session.id);
    try {
      await firstValueFrom(this.api.endSession(session.id));
      this.sessions.update((all) => all.filter((s) => s.id !== session.id));
      this.toast.add({ severity: 'success', summary: `${session.device} desconectado`, life: 3000 });
    } catch (error) {
      this.toast.add({ severity: 'error', summary: problemMessage(error) });
    } finally {
      this.ending.set(null);
    }
  }

  async endOthers(): Promise<void> {
    this.ending.set('others');
    try {
      const { ended } = await firstValueFrom(this.api.endOtherSessions());
      this.sessions.update((all) => all.filter((s) => s.current));
      this.toast.add({
        severity: 'success',
        summary: ended === 1 ? '1 aparelho desconectado' : `${ended} aparelhos desconectados`,
        life: 3000,
      });
    } catch (error) {
      this.toast.add({ severity: 'error', summary: problemMessage(error) });
    } finally {
      this.ending.set(null);
    }
  }

  icon(session: DeviceSession): string {
    return MOBILE.test(session.device) ? 'pi-mobile' : 'pi-desktop';
  }

  lastActive(session: DeviceSession): string {
    if (session.current) {
      return 'Este aparelho';
    }
    if (!session.lastActiveAt) {
      return 'Último acesso desconhecido';
    }
    return `Usado ${since(new Date(session.lastActiveAt))}`;
  }
}
