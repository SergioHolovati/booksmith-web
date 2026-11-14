import { Component, inject, input, model, output, signal } from '@angular/core';
import { MessageService } from 'primeng/api';
import { DrawerModule } from 'primeng/drawer';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { firstValueFrom } from 'rxjs';

import { problemMessage } from '../../../core/api/problem';
import { UniverseApi } from '../../../core/api/universe.api';
import { IllustrationResult, UniverseImage } from '../../../core/models/api.models';
import { IllustrationStudioComponent } from '../../../shared/illustration-studio/illustration-studio';
import { compressImage } from '../../../core/util/image';
import { GALLERY_MAX_DIMENSION } from '../../../shared/gallery/image-gallery';

/**
 * Escolher a imagem de uma ilustração: a biblioteca do universo do livro, ou uma foto nova (que entra na
 * biblioteca e já vai para o texto). Formato PNG ou JPEG, que o PDF e todo leitor de ePub abrem.
 */
@Component({
  selector: 'app-illustration-picker',
  imports: [DrawerModule, ProgressSpinnerModule, IllustrationStudioComponent],
  template: `
    <p-drawer [visible]="visible()" (visibleChange)="visible.set($event)" position="bottom" header="Ilustração"
      styleClass="illustration-picker" [style]="{ height: 'auto', maxHeight: '80dvh' }" (onShow)="load()">
      <p class="muted small hint">Escolha uma imagem da biblioteca do universo, envie uma nova ou gere com IA.</p>
      <div class="grid">
        <button type="button" class="add" (click)="studioOpen.set(true)" data-studio-open>
          <i class="pi pi-sparkles" aria-hidden="true"></i><small>Gerar com IA</small>
        </button>
        <label class="add" [class.busy]="uploading()">
          <input type="file" accept="image/*" class="file-input" (change)="upload($event)" aria-label="Enviar imagem"
            [disabled]="uploading()" />
          @if (uploading()) {
            <p-progress-spinner strokeWidth="5" styleClass="spin" />
          } @else {
            <i class="pi pi-upload" aria-hidden="true"></i><small>Enviar</small>
          }
        </label>
        @for (image of images(); track image.id) {
          <button type="button" class="thumb" (click)="choose(image)"
            [attr.aria-label]="'Usar ' + (image.caption || 'esta imagem')">
            <img [src]="image.url" alt="" loading="lazy" />
            @if (image.aiGenerated) {
              <span class="ai">IA</span>
            }
            @if (image.caption) {
              <span class="caption">{{ image.caption }}</span>
            }
          </button>
        }
      </div>
      @if (loading()) {
        <div class="center"><p-progress-spinner strokeWidth="4" styleClass="spin" /></div>
      }
    </p-drawer>
    <app-illustration-studio kind="scene" [universeId]="universeId()" [(visible)]="studioOpen"
      (generated)="onGenerated($event)" />
  `,
  styles: `
    .hint { margin: 0 0 .75rem; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: .5rem; }
    .add, .thumb { position: relative; aspect-ratio: 1; border-radius: var(--bs-radius-sm); overflow: hidden; }
    .add { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: .3rem;
      border: 1px dashed var(--bs-border); color: var(--bs-ember); cursor: pointer; }
    .thumb { padding: 0; border: 1px solid var(--bs-border); background: var(--bs-surface); cursor: pointer; }
    .thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .caption { position: absolute; left: 0; right: 0; bottom: 0; padding: .2rem .4rem; font-size: .7rem;
      color: #fff; background: rgba(0, 0, 0, .6); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .add { background: none; font: inherit; }
    .ai { position: absolute; top: .25rem; left: .25rem; padding: 0 .35rem; border-radius: 4px; font-size: .65rem;
      font-weight: 700; color: #fff; background: rgba(0, 0, 0, .65); }
    .file-input { position: absolute; width: 1px; height: 1px; opacity: 0; overflow: hidden; clip-path: inset(50%); }
    .center { display: flex; justify-content: center; padding: 1rem; }
    :host ::ng-deep .spin { width: 28px; height: 28px; }
  `,
})
export class IllustrationPickerComponent {
  private readonly api = inject(UniverseApi);
  private readonly toast = inject(MessageService);

  readonly universeId = input<string | null>(null);
  readonly visible = model(false);
  readonly picked = output<UniverseImage>();

  readonly images = signal<UniverseImage[]>([]);
  readonly loading = signal(false);
  readonly uploading = signal(false);
  readonly studioOpen = signal(false);

  async load(): Promise<void> {
    const universeId = this.universeId();
    if (!universeId) {
      return;
    }
    this.loading.set(true);
    try {
      this.images.set(await firstValueFrom(this.api.listImages(universeId)));
    } catch (error) {
      this.toast.add({ severity: 'error', summary: problemMessage(error), life: 5000 });
    } finally {
      this.loading.set(false);
    }
  }

  /** Cena gerada com IA: entra no texto como uma imagem da biblioteca (já está lá). */
  onGenerated(result: IllustrationResult): void {
    const universeId = this.universeId();
    if (!universeId) {
      return;
    }
    this.choose({
      id: result.imageId, universeId, url: result.url, contentType: 'image/jpeg', bytes: 0, caption: result.caption,
      entities: [], version: 0, createdAt: new Date().toISOString(), aiGenerated: true,
    });
  }

  choose(image: UniverseImage): void {
    this.picked.emit(image);
    this.visible.set(false);
  }

  async upload(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    const universeId = this.universeId();
    if (!file || !universeId) {
      return;
    }
    this.uploading.set(true);
    try {
      const dataUrl = await compressImage(file, GALLERY_MAX_DIMENSION, 0.85, 'portable');
      const image = await firstValueFrom(this.api.uploadImage(universeId, dataUrl, null, []));
      this.choose(image);
    } catch (error) {
      this.toast.add({ severity: 'error', summary: problemMessage(error, 'Não foi possível enviar a imagem.'), life: 5000 });
    } finally {
      this.uploading.set(false);
    }
  }
}
