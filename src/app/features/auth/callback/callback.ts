import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

import { AuthService } from '../../../core/auth/auth.service';

/** Recebe o token do login com Google no fragmento (#token=...), que não vai para servidores nem logs. */
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
    const token = new URLSearchParams(window.location.hash.slice(1)).get('token');
    // Remove o token da barra de endereço e do histórico
    history.replaceState(null, '', window.location.pathname);

    if (token) {
      this.auth.acceptToken(token);
      void this.router.navigate(['/home'], { replaceUrl: true });
    } else {
      void this.router.navigate(['/login'], { queryParams: { error: 'google' }, replaceUrl: true });
    }
  }
}
