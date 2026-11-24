import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageModule } from 'primeng/message';
import { firstValueFrom } from 'rxjs';

import { ImageReview, ImageReviewApi } from '../../../core/api/image-review.api';
import { problemMessage } from '../../../core/api/problem';

export const CATEGORY_LABEL: Record<ImageReview['category'], string> = {
  AVATAR: 'Foto de perfil',
  BOOK_COVER: 'Capa',
  UNIVERSE_MAP: 'Mapa',
  GALLERY: 'Biblioteca',
};

export const STATUS_LABEL: Record<ImageReview['status'], string> = {
  pending: 'Para revisar',
  blocked: 'Recusada na hora',
  kept: 'Mantida',
  removed: 'Removida',
};

/** "Nada para revisar.", "1 imagem para revisar.", "3 imagens para revisar." */
export function pendingText(count: number): string {
  if (count === 0) {
    return 'Nada para revisar.';
  }
  return count === 1 ? '1 imagem para revisar.' : `${count} imagens para revisar.`;
}

/**
 * Imagens da moderação (`/backoffice/moderacao`, só administradores): as que o classificador deixou entrar em dúvida, para
 * manter ou remover, e as que recusou na hora (sem a imagem, que não foi guardada).
 */
@Component({
  selector: 'app-image-reviews',
  imports: [DatePipe, DecimalPipe, ButtonModule, ConfirmDialogModule, MessageModule],
  providers: [ConfirmationService],
  templateUrl: './image-reviews.html',
  styleUrl: './image-reviews.scss',
})
export class ImageReviewsComponent {
  private readonly api = inject(ImageReviewApi);
  private readonly toast = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);

  readonly reviews = signal<ImageReview[] | null>(null);
  readonly error = signal<string | null>(null);
  readonly busy = signal<string | null>(null);
  readonly categoryLabel = CATEGORY_LABEL;
  readonly statusLabel = STATUS_LABEL;
  readonly pendingText = computed(() =>
    pendingText((this.reviews() ?? []).filter((r) => r.status === 'pending').length));

  constructor() {
    queueMicrotask(() => void this.load());
  }

  async load(): Promise<void> {
    this.error.set(null);
    try {
      this.reviews.set(await firstValueFrom(this.api.list()));
    } catch (error) {
      this.error.set(problemMessage(error, 'Não foi possível carregar as imagens.'));
    }
  }

  keep(review: ImageReview): void {
    void this.decide(review, 'keep');
  }

  remove(review: ImageReview): void {
    this.confirm.confirm({
      header: 'Remover a imagem?',
      message: 'Ela sai do armazenamento e some de onde estava (biblioteca, capa ou perfil). Não dá para desfazer.',
      acceptLabel: 'Remover',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => void this.decide(review, 'remove'),
    });
  }

  private async decide(review: ImageReview, action: 'keep' | 'remove'): Promise<void> {
    this.busy.set(review.id);
    try {
      await firstValueFrom(action === 'keep' ? this.api.keep(review.id) : this.api.remove(review.id));
      this.toast.add({ severity: 'success', summary: action === 'keep' ? 'Imagem mantida' : 'Imagem removida', life: 3000 });
      await this.load();
    } catch (error) {
      this.toast.add({ severity: 'error', summary: problemMessage(error), life: 5000 });
    } finally {
      this.busy.set(null);
    }
  }
}
