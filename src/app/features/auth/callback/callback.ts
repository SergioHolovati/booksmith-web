import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

import { problemOf } from '../../../core/api/problem';
import { AuthService } from '../../../core/auth/auth.service';
import { mfaState } from '../mfa-challenge/mfa-challenge';

/**
 * Recebe o código de uso único do login com Google no fragmento (#code=...), que não vai para servidores nem logs,
 * e troca pela sessão. O código vale 60 segundos e uma vez só: o que sobra no histórico não abre a conta.
 */
@Component({
  selector: 'app-callback',
  imports: [ProgressSpinnerModule],
  template: `
    <div class="callback">
      <p-progress-spinner strokeWidth="4" />
      <h2>Entrando...</h2>
    </div>
  `,
  styles: `
    .callback {
      min-height: 100dvh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1.5rem;
    }
  `,
})
export class CallbackComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  ngOnInit(): void {
    const code = new URLSearchParams(window.location.hash.slice(1)).get('code');
    // Tira o código da barra de endereço e do histórico
    history.replaceState(null, '', window.location.pathname);
    void this.finish(code);
  }

  private async finish(code: string | null): Promise<void> {
    if (!code) {
      await this.router.navigate(['/login'], { queryParams: { error: 'google' }, replaceUrl: true });
      return;
    }
    try {
      await this.auth.exchangeGoogleCode(code);
      const target = this.auth.user()?.profilePending ? '/completar-cadastro' : '/home';
      await this.router.navigate([target], { replaceUrl: true });
    } catch (error) {
      const problem = problemOf(error);
      if (problem?.code === 'mfa_required') {
        await this.router.navigate(['/verificacao'], { state: mfaState(problem), replaceUrl: true });
        return;
      }
      await this.router.navigate(['/login'], { queryParams: { error: 'google' }, replaceUrl: true });
    }
  }
}
