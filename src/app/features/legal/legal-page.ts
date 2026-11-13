import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';
import { LEGAL_TEXTS, LegalDocument } from './legal-documents';

/**
 * Páginas públicas `/termos` e `/privacidade` (a rota diz qual documento em `data.document`). Abrem sem login, do
 * cadastro, do perfil e da tela de aceite. A versão em vigor vem do servidor.
 */
@Component({
  selector: 'app-legal-page',
  imports: [RouterLink],
  template: `
    <div class="legal-page">
      <article class="legal">
        <a routerLink="/login" class="back"><i class="pi pi-arrow-left" aria-hidden="true"></i> Booksmith</a>
        <h1>{{ text.title }}</h1>
        <p class="muted small" data-legal-version>
          Versão {{ version() ?? '…' }}. Minuta em revisão por advogado: o texto pode mudar antes da versão final.
        </p>
        <p class="intro">{{ text.intro }}</p>
        @for (section of text.sections; track section.title) {
          <section>
            <h2>{{ section.title }}</h2>
            @for (p of section.paragraphs; track $index) {
              <p>{{ p }}</p>
            }
            @if (section.items; as items) {
              <ul>
                @for (item of items; track $index) {
                  <li>{{ item }}</li>
                }
              </ul>
            }
          </section>
        }
        <p class="other">
          @if (document === 'terms') {
            Veja também a <a routerLink="/privacidade">Política de privacidade</a>.
          } @else {
            Veja também os <a routerLink="/termos">Termos de uso</a>.
          }
        </p>
      </article>
    </div>
  `,
  styles: `
    .legal-page { min-height: 100dvh; padding: max(1rem, env(safe-area-inset-top)) 16px 3rem; background: var(--bs-bg, #090909); }
    .legal { max-width: 720px; margin: 0 auto; line-height: 1.6; overflow-wrap: anywhere; }
    .back { display: inline-flex; align-items: center; gap: .4rem; min-height: var(--bs-touch); color: var(--bs-ember); }
    h1 { font-size: 1.6rem; margin: .5rem 0 .25rem; }
    h2 { font-size: 1.1rem; margin: 1.5rem 0 .5rem; }
    .intro { font-size: 1.05rem; }
    ul { padding-left: 1.2rem; }
    li { margin: .35rem 0; }
    .other { margin-top: 2rem; }
    a { color: var(--bs-ember); }
  `,
})
export class LegalPageComponent {
  private readonly auth = inject(AuthService);

  readonly document: LegalDocument = inject(ActivatedRoute).snapshot.data['document'] === 'privacy' ? 'privacy' : 'terms';
  readonly text = LEGAL_TEXTS[this.document];
  readonly version = signal<string | null>(null);

  constructor() {
    void this.auth.config().then((config) => this.version.set(config.termsVersion)).catch(() => undefined);
  }
}
