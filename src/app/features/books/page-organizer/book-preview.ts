import { Component, HostListener, computed, inject, input, model, signal } from '@angular/core';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { firstValueFrom } from 'rxjs';

import { ExportApi } from '../../../core/api/export.api';
import { problemMessage } from '../../../core/api/problem';
import { BookLayout } from '../../../core/models/api.models';

/**
 * As páginas que um passo da prévia mostra, a partir de 1. No livro aberto (tela larga), a primeira página fica
 * sozinha (à direita, como no livro impresso) e depois vêm os pares 2-3, 4-5…; na tela estreita, uma por vez.
 */
export function previewPages(step: number, pageCount: number, open: boolean): number[] {
  if (!open) {
    return step < pageCount ? [step + 1] : [];
  }
  const pages = step === 0 ? [1] : [2 * step, 2 * step + 1];
  return pages.filter((n) => n <= pageCount);
}

/** Quantos passos a prévia tem. */
export function previewSteps(pageCount: number, open: boolean): number {
  return open ? Math.floor(pageCount / 2) + 1 : pageCount;
}

/**
 * Prévia do livro ilustrado: as páginas do PDF de verdade (com a névoa, o desfoque e os blocos como vão sair), em
 * tela cheia, folheando com as setas (ou o teclado).
 */
@Component({
  selector: 'app-book-preview',
  imports: [ProgressSpinnerModule],
  template: `
    @if (visible()) {
      <div class="overlay" role="dialog" aria-modal="true" aria-label="Prévia do livro" data-book-preview>
        <div class="bar">
          <span class="count" data-preview-count>{{ label() }}</span>
          <button type="button" class="close" (click)="visible.set(false)" aria-label="Fechar a prévia" data-preview-close>
            <i class="pi pi-times" aria-hidden="true"></i></button>
        </div>
        <div class="stage">
          @if (error(); as message) {
            <p class="error" role="alert">{{ message }}</p>
          } @else if (loading()) {
            <p-progress-spinner strokeWidth="4" />
          } @else {
            <div class="spread" [class.single]="shown().length === 1">
              @for (page of shown(); track page.number) {
                <img [src]="page.image" [alt]="'Página ' + page.number" data-preview-page />
              }
            </div>
          }
        </div>
        <div class="nav">
          <button type="button" class="nav-btn" [disabled]="step() === 0 || loading()" (click)="go(-1)"
            aria-label="Voltar" data-preview-prev><i class="pi pi-chevron-left" aria-hidden="true"></i></button>
          <button type="button" class="nav-btn" [disabled]="step() >= steps() - 1 || loading()" (click)="go(1)"
            aria-label="Avançar" data-preview-next><i class="pi pi-chevron-right" aria-hidden="true"></i></button>
        </div>
      </div>
    }
  `,
  styles: `
    .overlay { position: fixed; inset: 0; z-index: 1100; display: flex; flex-direction: column;
      background: rgba(8, 8, 8, .96); padding: env(safe-area-inset-top, 0) 0 env(safe-area-inset-bottom, 0); }
    .bar { display: flex; align-items: center; justify-content: space-between; padding: .6rem 1rem; }
    .count { color: var(--bs-text-soft); font-size: .9rem; }
    .close, .nav-btn { min-width: var(--bs-touch, 44px); min-height: var(--bs-touch, 44px); border: 1px solid var(--bs-border);
      border-radius: 999px; background: var(--bs-surface); color: var(--bs-text); cursor: pointer; }
    .nav-btn:disabled { opacity: .35; cursor: default; }
    .stage { flex: 1; min-height: 0; display: flex; align-items: center; justify-content: center; padding: 0 1rem; }
    .spread { display: flex; justify-content: center; max-width: 100%; max-height: 100%; }
    .spread img { display: block; max-width: 50%; max-height: calc(100dvh - 9rem); object-fit: contain;
      box-shadow: 0 4px 24px rgba(0, 0, 0, .6); }
    .spread.single img { max-width: 100%; }
    .spread:not(.single) img:first-child { margin-left: auto; }
    .nav { display: flex; justify-content: center; gap: 2rem; padding: .8rem 1rem 1rem; }
    .error { color: var(--bs-danger, #e5484d); }
  `,
})
export class BookPreviewComponent {
  private readonly exportApi = inject(ExportApi);

  readonly bookId = input.required<string>();
  readonly layout = input.required<BookLayout>();
  readonly visible = model(false);

  /** Livro aberto (duas páginas) na tela larga; uma por vez no celular. */
  readonly open = signal(false);
  readonly step = signal(0);
  readonly pageCount = signal(0);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  private readonly images = signal<Record<number, string>>({});

  readonly steps = computed(() => previewSteps(this.pageCount(), this.open()));
  readonly shown = computed(() =>
    previewPages(this.step(), this.pageCount(), this.open())
      .map((number) => ({ number, image: this.images()[number] }))
      .filter((page) => !!page.image),
  );
  readonly label = computed(() => {
    const numbers = previewPages(this.step(), this.pageCount(), this.open());
    if (!this.pageCount() || !numbers.length) {
      return 'Prévia';
    }
    return `Página ${numbers.join('–')} de ${this.pageCount()}`;
  });

  /** Abre do começo, no modo da tela. */
  async start(): Promise<void> {
    this.open.set(window.innerWidth >= 720);
    this.step.set(0);
    this.images.set({});
    this.error.set(null);
    this.visible.set(true);
    await this.fetch(1, 2);
  }

  async go(direction: -1 | 1): Promise<void> {
    const next = Math.max(0, Math.min(this.steps() - 1, this.step() + direction));
    const pages = previewPages(next, this.pageCount(), this.open());
    this.step.set(next);
    const missing = pages.filter((n) => !this.images()[n]);
    if (missing.length) {
      await this.fetch(missing[0], missing.length);
    }
  }

  @HostListener('document:keydown', ['$event'])
  onKey(event: KeyboardEvent): void {
    if (!this.visible()) {
      return;
    }
    if (event.key === 'ArrowRight') {
      void this.go(1);
    } else if (event.key === 'ArrowLeft') {
      void this.go(-1);
    } else if (event.key === 'Escape') {
      this.visible.set(false);
    }
  }

  private async fetch(from: number, count: number): Promise<void> {
    this.loading.set(true);
    try {
      const preview = await firstValueFrom(this.exportApi.preview(this.bookId(), this.layout(), from, count));
      this.pageCount.set(preview.pageCount);
      this.images.update((all) => ({ ...all, ...Object.fromEntries(preview.pages.map((p) => [p.number, p.image])) }));
    } catch (error) {
      this.error.set(problemMessage(error, 'Não foi possível montar a prévia.'));
    } finally {
      this.loading.set(false);
    }
  }
}
