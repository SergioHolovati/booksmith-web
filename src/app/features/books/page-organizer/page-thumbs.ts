import { Component, OnInit, inject, input, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ExportApi } from '../../../core/api/export.api';
import { BookLayout } from '../../../core/models/api.models';

/** Pedidos de miniaturas: até 16 páginas por vez (o limite da API). */
const CHUNK = 16;

/**
 * As páginas de um trecho do livro de texto (do PDF de verdade), em miniatura. Carrega quando aparece na tela
 * (dentro de um {@code @defer (on viewport)}), em pedidos de até 16 páginas.
 */
@Component({
  selector: 'app-page-thumbs',
  template: `
    @for (n of numbers(); track n) {
      <span class="page" [style.aspect-ratio]="ratio()" [attr.data-thumb-page]="n">
        @if (images()[n]; as src) {
          <img [src]="src" alt="" />
        }
        <span class="number">{{ n }}</span>
      </span>
    }
  `,
  styles: `
    :host { display: grid; grid-template-columns: repeat(auto-fill, minmax(64px, 1fr)); gap: .4rem; }
    .page { position: relative; display: block; overflow: hidden; border-radius: 2px; background: #f4f1ea;
      box-shadow: 0 1px 4px rgba(0, 0, 0, .35); }
    img { display: block; width: 100%; height: 100%; object-fit: cover; }
    .number { position: absolute; right: 3px; bottom: 2px; padding: 0 .25rem; border-radius: 3px; font-size: .62rem;
      color: #fff; background: rgba(0, 0, 0, .55); }
  `,
})
export class PageThumbsComponent implements OnInit {
  private readonly exportApi = inject(ExportApi);

  readonly bookId = input.required<string>();
  readonly layout = input.required<BookLayout>();
  readonly first = input.required<number>();
  readonly count = input.required<number>();
  /** Largura / altura da página. */
  readonly ratio = input('148 / 210');

  readonly images = signal<Record<number, string>>({});

  numbers(): number[] {
    return Array.from({ length: this.count() }, (_, i) => this.first() + i);
  }

  ngOnInit(): void {
    // Aqui, e não no construtor: as entradas (que páginas) já chegaram
    void this.load();
  }

  private async load(): Promise<void> {
    for (let from = this.first(); from < this.first() + this.count(); from += CHUNK) {
      const count = Math.min(CHUNK, this.first() + this.count() - from);
      try {
        const preview = await firstValueFrom(this.exportApi.thumbnails(this.bookId(), this.layout(), from, count));
        this.images.update((images) => ({
          ...images, ...Object.fromEntries(preview.pages.map((p) => [p.number, p.image])),
        }));
      } catch {
        return;
      }
    }
  }
}
