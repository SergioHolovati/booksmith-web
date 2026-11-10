import { Component, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { UniverseApi } from '../../core/api/universe.api';
import { ImageGalleryComponent } from '../../shared/gallery/image-gallery';

/** Biblioteca de imagens do universo (`/universes/:id/imagens`): tudo o que foi enviado, de todos os livros. */
@Component({
  selector: 'app-gallery-page',
  imports: [RouterLink, ImageGalleryComponent],
  template: `
    <div class="page narrow">
      <a [routerLink]="['/universes', universeId()]" class="back-link">
        <i class="pi pi-arrow-left"></i> {{ universeName() ?? 'Universo' }}
      </a>
      <div class="page-header">
        <div>
          <h1 class="page-title">Imagens</h1>
          <p class="page-subtitle">Retratos, referências e desenhos do seu mundo. Toque numa imagem para dar legenda e
            dizer quem ou o que aparece nela.</p>
        </div>
      </div>
      <app-image-gallery [universeId]="universeId()" />
    </div>
  `,
})
export class GalleryPageComponent {
  private readonly api = inject(UniverseApi);

  readonly universeId = input.required<string>();
  readonly universeName = signal<string | null>(null);

  constructor() {
    queueMicrotask(async () => {
      try {
        this.universeName.set((await firstValueFrom(this.api.getUniverse(this.universeId()))).name);
      } catch {
        // o link de volta fica "Universo"
      }
    });
  }
}
