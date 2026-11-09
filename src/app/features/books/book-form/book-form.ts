import { Component, computed, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TextareaModule } from 'primeng/textarea';
import { firstValueFrom } from 'rxjs';

import { ManuscriptApi } from '../../../core/api/manuscript.api';
import { problemMessage } from '../../../core/api/problem';
import { UniverseApi } from '../../../core/api/universe.api';
import { BookKind, BookLanguage, BookStatus, Universe } from '../../../core/models/api.models';
import { compressImage } from '../../../core/util/image';
import { BookCoverComponent } from '../book-cover';
import { KIND_LABEL, LANGUAGE_LABEL, STATUS_LABEL } from '../book-labels';

/**
 * Cria (/books/new) ou edita (/books/:bookId/edit) um livro. Ao criar, o livro pode entrar num universo que
 * já existe (`?universe=` vem da página de universos); ao editar, pode juntar-se ao universo de outro livro.
 */
@Component({
  selector: 'app-book-form',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    ButtonModule,
    ConfirmDialogModule,
    InputTextModule,
    MessageModule,
    SelectModule,
    SelectButtonModule,
    TextareaModule,
    BookCoverComponent,
  ],
  providers: [ConfirmationService],
  templateUrl: './book-form.html',
  styleUrl: './book-form.scss',
})
export class BookFormComponent {
  private readonly api = inject(ManuscriptApi);
  private readonly router = inject(Router);
  private readonly toast = inject(MessageService);
  private readonly universeApi = inject(UniverseApi);
  private readonly confirm = inject(ConfirmationService);

  readonly bookId = input<string>();
  /** Query param `universe`: criar o livro direto num universo (série). */
  readonly universe = input<string>();
  readonly isEdit = computed(() => !!this.bookId());

  readonly kindOptions = (Object.keys(KIND_LABEL) as BookKind[]).map((value) => ({ value, label: KIND_LABEL[value] }));
  readonly languageOptions = (Object.keys(LANGUAGE_LABEL) as BookLanguage[]).map((value) => ({
    value,
    label: LANGUAGE_LABEL[value],
  }));
  readonly statusOptions = (Object.keys(STATUS_LABEL) as BookStatus[]).map((value) => ({
    value,
    label: STATUS_LABEL[value],
  }));

  readonly form = inject(FormBuilder).nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(200)]],
    kind: ['ORIGINAL' as BookKind, Validators.required],
    fandom: ['', Validators.maxLength(200)],
    synopsis: ['', Validators.maxLength(4000)],
    language: ['pt-BR' as BookLanguage, Validators.required],
    status: ['DRAFT' as BookStatus],
  });

  readonly kind = toSignal(this.form.controls.kind.valueChanges, { initialValue: this.form.controls.kind.value });
  readonly titleValue = toSignal(this.form.controls.title.valueChanges, { initialValue: '' });

  readonly coverPreview = signal<string | null>(null);
  private newCover: string | null = null;
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly message = signal<string | null>(null);

  readonly universes = signal<Universe[]>([]);
  /** Universo escolhido na criação; `null` cria um novo, só deste livro. */
  readonly universeId = signal<string | null>(null);
  /** Universo atual do livro sendo editado. */
  readonly currentUniverseId = signal<string | null>(null);
  readonly moveTarget = signal<string | null>(null);
  readonly moving = signal(false);
  readonly universeOptions = computed(() => [
    { id: null, name: 'Um universo novo, só deste livro' },
    ...this.universes().map((u) => ({ id: u.id as string | null, name: u.name })),
  ]);
  readonly currentUniverse = computed(() => this.universes().find((u) => u.id === this.currentUniverseId()) ?? null);
  readonly otherUniverses = computed(() => this.universes().filter((u) => u.id !== this.currentUniverseId()));

  constructor() {
    queueMicrotask(() => {
      void this.loadBook();
      void this.loadUniverses();
    });
  }

  private async loadUniverses(): Promise<void> {
    try {
      const universes = await firstValueFrom(this.universeApi.listUniverses());
      this.universes.set(universes);
      const wanted = this.universe();
      if (!this.isEdit() && wanted && universes.some((u) => u.id === wanted)) {
        this.universeId.set(wanted);
      }
    } catch {
      // sem a lista, o livro é criado num universo novo, como sempre
    }
  }

  /** Juntar o livro ao universo de outro: confirma antes, porque não dá para desfazer pelo app. */
  askMove(): void {
    const target = this.universes().find((u) => u.id === this.moveTarget());
    if (!target) {
      return;
    }
    this.confirm.confirm({
      header: `Levar para "${target.name}"?`,
      message:
        'O livro passa a usar os personagens, lugares e a linha do tempo desse universo. Se ele era o único livro ' +
        'do universo atual, tudo o que você criou nele vai junto; nada é apagado.',
      acceptLabel: 'Levar',
      rejectLabel: 'Cancelar',
      rejectButtonStyleClass: 'p-button-text p-button-secondary',
      accept: () => void this.move(target),
    });
  }

  private async move(target: Universe): Promise<void> {
    const bookId = this.bookId();
    if (!bookId) {
      return;
    }
    this.moving.set(true);
    try {
      const result = await firstValueFrom(this.api.moveToUniverse(bookId, target.id));
      this.currentUniverseId.set(result.universeId);
      this.moveTarget.set(null);
      await this.loadUniverses();
      this.toast.add({ severity: 'success', summary: `O livro agora está em "${target.name}"`, life: 4000 });
      if (result.duplicateNames.length > 0) {
        this.toast.add({
          severity: 'warn',
          summary: 'Nomes repetidos',
          detail:
            `${result.duplicateNames.join(', ')} já existia(m) no universo. Os dois ficaram; ` +
            'abra Personagens ou Lugares e exclua a cópia que sobrar.',
          sticky: true,
        });
      }
    } catch (error) {
      this.toast.add({ severity: 'error', summary: problemMessage(error, 'Não foi possível mudar o universo.') });
    } finally {
      this.moving.set(false);
    }
  }

  private async loadBook(): Promise<void> {
    const bookId = this.bookId();
    if (!bookId) {
      return;
    }
    this.loading.set(true);
    try {
      const book = await firstValueFrom(this.api.getBook(bookId));
      this.form.setValue({
        title: book.title,
        kind: book.kind,
        fandom: book.fandom ?? '',
        synopsis: book.synopsis ?? '',
        language: book.language,
        status: book.status,
      });
      this.coverPreview.set(book.coverUrl);
      this.currentUniverseId.set(book.universeId);
    } catch (error) {
      this.message.set(problemMessage(error, 'Não foi possível carregar o livro.'));
    } finally {
      this.loading.set(false);
    }
  }

  async onCoverSelected(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) {
      return;
    }
    try {
      this.newCover = await compressImage(file, 1600);
      this.coverPreview.set(this.newCover);
    } catch (error) {
      this.message.set(error instanceof Error ? error.message : 'Imagem inválida.');
    }
  }

  async save(): Promise<void> {
    const { title, kind, fandom, synopsis, language, status } = this.form.getRawValue();
    if (this.form.invalid || (kind === 'FANFIC' && !fandom.trim())) {
      this.form.markAllAsTouched();
      this.message.set(kind === 'FANFIC' && !fandom.trim() ? 'Informe o fandom da fanfic.' : null);
      return;
    }

    const request = {
      title: title.trim(),
      kind,
      fandom: kind === 'FANFIC' ? fandom.trim() : null,
      synopsis: synopsis.trim() || null,
      language,
      status: this.isEdit() ? status : undefined,
      cover: this.newCover,
      universeId: this.isEdit() ? undefined : this.universeId(),
    };

    this.saving.set(true);
    this.message.set(null);
    try {
      const bookId = this.bookId();
      const book = bookId
        ? await firstValueFrom(this.api.updateBook(bookId, request))
        : await firstValueFrom(this.api.createBook(request));
      this.toast.add({ severity: 'success', summary: bookId ? 'Livro atualizado' : 'Livro criado' });
      await this.router.navigate(['/books', book.id], { replaceUrl: true });
    } catch (error) {
      this.message.set(problemMessage(error, 'Não foi possível salvar o livro.'));
    } finally {
      this.saving.set(false);
    }
  }
}
