import { Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { firstValueFrom } from 'rxjs';

import { ManuscriptApi } from '../../../core/api/manuscript.api';
import { problemMessage } from '../../../core/api/problem';
import { UniverseApi } from '../../../core/api/universe.api';
import { BookDetail, PlaceSummary, UniverseDetail } from '../../../core/models/api.models';
import { PLACE_ICON, PLACE_TYPE_LABEL, placeTree } from '../place-labels';

/**
 * Lugares do universo, em árvore: cada lugar com o que está dentro dele. Abre pelo livro
 * (`/books/:bookId/places`) ou direto pelo universo (`/universes/:universeId/places`), mesmo sem livro.
 */
@Component({
  selector: 'app-place-list',
  imports: [RouterLink, FormsModule, ButtonModule, InputTextModule, ProgressSpinnerModule],
  templateUrl: './place-list.html',
  styleUrl: './place-list.scss',
})
export class PlaceListComponent {
  private readonly manuscript = inject(ManuscriptApi);
  private readonly universe = inject(UniverseApi);
  private readonly router = inject(Router);
  private readonly toast = inject(MessageService);

  readonly bookId = input<string>();
  readonly universeId = input<string>();

  readonly book = signal<BookDetail | null>(null);
  readonly universeDetail = signal<UniverseDetail | null>(null);
  /** Universo dos lugares: o do parâmetro ou o do livro. */
  readonly currentUniverseId = computed(() => this.universeId() ?? this.book()?.universeId ?? null);
  /** Rota de cada lugar e da volta, pelo livro ou pelo universo. */
  readonly base = computed(() =>
    this.bookId() ? ['/books', this.bookId() as string] : ['/universes', this.universeId() as string],
  );
  readonly backLabel = computed(() => this.book()?.title ?? this.universeDetail()?.name ?? 'Voltar');
  readonly places = signal<PlaceSummary[]>([]);
  readonly tree = computed(() => placeTree(this.places()));
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly creating = signal(false);
  readonly typeLabel = PLACE_TYPE_LABEL;
  newName = '';

  constructor() {
    queueMicrotask(() => void this.load());
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const bookId = this.bookId();
      if (bookId) {
        this.book.set(await firstValueFrom(this.manuscript.getBook(bookId)));
      } else {
        this.universeDetail.set(await firstValueFrom(this.universe.getUniverse(this.universeId() as string)));
      }
      this.places.set(await firstValueFrom(this.universe.listPlaces(this.currentUniverseId() as string)));
    } catch (error) {
      this.error.set(problemMessage(error, 'Não foi possível carregar os lugares.'));
    } finally {
      this.loading.set(false);
    }
  }

  async create(): Promise<void> {
    const universeId = this.currentUniverseId();
    const name = this.newName.trim();
    if (!universeId || !name) {
      return;
    }
    this.creating.set(true);
    try {
      const place = await firstValueFrom(this.universe.createPlace(universeId, name));
      this.newName = '';
      await this.router.navigate([...this.base(), 'places', place.id]);
    } catch (error) {
      this.toast.add({ severity: 'error', summary: problemMessage(error) });
    } finally {
      this.creating.set(false);
    }
  }

  icon(place: PlaceSummary): string {
    return (place.type && PLACE_ICON[place.type]) || 'pi-map-marker';
  }
}
