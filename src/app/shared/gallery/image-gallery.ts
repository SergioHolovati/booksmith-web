import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { MultiSelectModule } from 'primeng/multiselect';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TextareaModule } from 'primeng/textarea';
import { firstValueFrom } from 'rxjs';

import { problemMessage } from '../../core/api/problem';
import { UniverseApi } from '../../core/api/universe.api';
import { Portrait, UniverseImage } from '../../core/models/api.models';
import { compressImage } from '../../core/util/image';

/** Opção de ligação: personagem, lugar ou ficha do mundo, agrupados pelo tipo. */
interface LinkGroup {
  label: string;
  items: { label: string; value: string }[];
}

/** Lado maior da foto depois de reduzida no aparelho: boa para retrato e referência, leve no plano de dados. */
export const GALLERY_MAX_DIMENSION = 2000;

/**
 * Biblioteca de imagens do universo. Sem `entityId`, mostra todas (página "Imagens"); com ele, só as ligadas
 * àquele personagem ou lugar, e o que for enviado ali já nasce ligado a ele, com a opção de virar retrato.
 * Tocar numa imagem abre a legenda, as ligações e as ações.
 */
@Component({
  selector: 'app-image-gallery',
  imports: [FormsModule, ButtonModule, DrawerModule, MultiSelectModule, ProgressSpinnerModule, TextareaModule],
  templateUrl: './image-gallery.html',
  styleUrl: './image-gallery.scss',
})
export class ImageGalleryComponent {
  private readonly api = inject(UniverseApi);
  private readonly toast = inject(MessageService);

  readonly universeId = input.required<string>();
  /** Personagem ou lugar dono desta galeria (na ficha). */
  readonly entityId = input<string | null>(null);
  /** Retrato atual do personagem ou lugar, para marcar a imagem. */
  readonly portraitId = input<string | null>(null);
  /** Mostra o título "Imagens" e a moldura de cartão (na ficha). */
  readonly card = input(false);

  readonly portraitChange = output<Portrait>();

  readonly images = signal<UniverseImage[]>([]);
  readonly loading = signal(true);
  readonly uploading = signal(0);
  readonly selected = signal<UniverseImage | null>(null);
  readonly saving = signal(false);
  readonly linkGroups = signal<LinkGroup[]>([]);
  drawerOpen = false;
  caption = '';
  links: string[] = [];

  readonly empty = computed(() => !this.loading() && this.images().length === 0 && this.uploading() === 0);

  constructor() {
    queueMicrotask(() => void this.load());
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      this.images.set(await firstValueFrom(this.api.listImages(this.universeId(), this.entityId() ?? undefined)));
    } catch (error) {
      this.toast.add({ severity: 'error', summary: problemMessage(error, 'Não foi possível carregar as imagens.') });
    } finally {
      this.loading.set(false);
    }
  }

  /** Reduz cada foto no aparelho e envia uma a uma (uma que falhe não impede as outras). */
  async upload(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (files.length === 0) {
      return;
    }
    this.uploading.set(files.length);
    const links = this.entityId() ? [this.entityId()!] : [];
    let failed = 0;
    for (const file of files) {
      try {
        const dataUrl = await compressImage(file, GALLERY_MAX_DIMENSION);
        const image = await firstValueFrom(this.api.uploadImage(this.universeId(), dataUrl, null, links));
        this.images.update((list) => [image, ...list]);
      } catch (error) {
        failed++;
        if (failed === 1) {
          this.toast.add({ severity: 'error', summary: problemMessage(error, 'Não foi possível enviar a imagem.') });
        }
      } finally {
        this.uploading.update((n) => n - 1);
      }
    }
    const sent = files.length - failed;
    if (sent > 0) {
      this.toast.add({ severity: 'success', summary: sent === 1 ? 'Imagem enviada' : `${sent} imagens enviadas`, life: 3000 });
    }
  }

  async open(image: UniverseImage): Promise<void> {
    this.selected.set(image);
    this.caption = image.caption ?? '';
    this.links = image.entities.map((e) => e.id);
    this.drawerOpen = true;
    if (this.linkGroups().length === 0) {
      await this.loadLinkOptions();
    }
  }

  async save(): Promise<void> {
    const image = this.selected();
    if (!image) {
      return;
    }
    this.saving.set(true);
    try {
      const saved = await firstValueFrom(
        this.api.updateImage(image.id, { version: image.version, caption: this.caption.trim() || null, entityIds: this.links }),
      );
      const stillHere = !this.entityId() || saved.entities.some((e) => e.id === this.entityId());
      this.images.update((list) => (stillHere ? list.map((i) => (i.id === saved.id ? saved : i)) : list.filter((i) => i.id !== saved.id)));
      this.drawerOpen = false;
      this.toast.add({ severity: 'success', summary: 'Imagem salva', life: 2500 });
    } catch (error) {
      this.toast.add({ severity: 'error', summary: problemMessage(error, 'Não foi possível salvar a imagem.') });
    } finally {
      this.saving.set(false);
    }
  }

  async makePortrait(image: UniverseImage): Promise<void> {
    const entityId = this.entityId();
    if (!entityId) {
      return;
    }
    const remove = this.portraitId() === image.id;
    this.saving.set(true);
    try {
      // Legenda ou ligações mudadas antes de tocar aqui não se perdem
      const caption = this.caption.trim() || null;
      const sameLinks = [...this.links].sort().join() === image.entities.map((e) => e.id).sort().join();
      if (caption !== image.caption || !sameLinks) {
        const saved = await firstValueFrom(
          this.api.updateImage(image.id, { version: image.version, caption, entityIds: this.links }),
        );
        this.images.update((list) => list.map((i) => (i.id === saved.id ? saved : i)));
      }
      const portrait = await firstValueFrom(this.api.setPortrait(entityId, remove ? null : image.id));
      this.portraitChange.emit(portrait);
      this.drawerOpen = false;
      this.toast.add({ severity: 'success', summary: remove ? 'Retrato removido' : 'Retrato escolhido', life: 2500 });
    } catch (error) {
      this.toast.add({ severity: 'error', summary: problemMessage(error) });
    } finally {
      this.saving.set(false);
    }
  }

  async remove(image: UniverseImage): Promise<void> {
    this.saving.set(true);
    try {
      await firstValueFrom(this.api.deleteImage(image.id));
      this.images.update((list) => list.filter((i) => i.id !== image.id));
      if (this.portraitId() === image.id && this.entityId()) {
        this.portraitChange.emit({ entityId: this.entityId()!, imageId: null, url: null });
      }
      this.drawerOpen = false;
      this.toast.add({ severity: 'success', summary: 'Imagem na lixeira por 30 dias', life: 3000 });
    } catch (error) {
      this.toast.add({ severity: 'error', summary: problemMessage(error) });
    } finally {
      this.saving.set(false);
    }
  }

  linkNames(image: UniverseImage): string {
    return image.entities.map((e) => e.name).join(', ');
  }

  private async loadLinkOptions(): Promise<void> {
    try {
      const [characters, places, lore] = await Promise.all([
        firstValueFrom(this.api.listCharacters(this.universeId())),
        firstValueFrom(this.api.listPlaces(this.universeId())),
        firstValueFrom(this.api.listLore(this.universeId())),
      ]);
      const group = (label: string, items: { id: string; name: string }[]) => ({
        label,
        items: items.map((i) => ({ label: i.name, value: i.id })),
      });
      this.linkGroups.set(
        [group('Personagens', characters), group('Lugares', places), group('Mundo', lore)].filter((g) => g.items.length > 0),
      );
    } catch {
      this.linkGroups.set([]); // a legenda continua editável sem as opções
    }
  }
}
