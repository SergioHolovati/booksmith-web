import { Component, ElementRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { firstValueFrom } from 'rxjs';

import { ProfileApi } from '../../core/api/profile.api';
import { problemMessage } from '../../core/api/problem';
import { AuthService } from '../../core/auth/auth.service';
import { Profile } from '../../core/models/api.models';
import { compressImage } from '../../core/util/image';

@Component({
  selector: 'app-profile',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    AutoCompleteModule,
    ButtonModule,
    InputTextModule,
    MessageModule,
    ProgressSpinnerModule,
    SelectModule,
    TextareaModule,
  ],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class ProfileComponent {
  private readonly api = inject(ProfileApi);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(MessageService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly audiences = ['Infantil', 'Juvenil', 'Jovem adulto', 'Adulto'];
  readonly languages = ['Português', 'Inglês', 'Espanhol', 'Francês'];

  readonly profile = signal<Profile | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly editingAuthor = signal(false);
  readonly message = signal<string | null>(null);
  /** Erro do formulário, mostrado perto do botão Salvar (no celular o topo da página fica fora da vista). */
  readonly formError = signal<string | null>(null);
  readonly avatarPreview = signal<string | null>(null);
  private newAvatar: string | null = null;

  readonly form = inject(FormBuilder).nonNullable.group({
    penName: ['', [Validators.required, Validators.maxLength(80)]],
    bio: ['', [Validators.required, Validators.maxLength(2000)]],
    audience: ['', Validators.required],
    language: ['Português', Validators.required],
    bookGenres: [[] as string[], Validators.required],
    writingStyles: [[] as string[]],
    authorReferences: [[] as string[]],
    socialLinks: [[] as string[]],
  });

  constructor() {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      const profile = await firstValueFrom(this.api.get());
      this.profile.set(profile);
      if (profile.author) {
        this.form.patchValue(profile.author);
        this.avatarPreview.set(profile.author.avatarUrl);
      }
    } catch (error) {
      this.message.set(problemMessage(error, 'Não foi possível carregar o perfil.'));
    } finally {
      this.loading.set(false);
    }
  }

  async onAvatarSelected(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) {
      return;
    }
    try {
      this.newAvatar = await compressImage(file, 512);
      this.avatarPreview.set(this.newAvatar);
    } catch (error) {
      this.message.set(error instanceof Error ? error.message : 'Imagem inválida.');
    }
  }

  /** O campo tem erro e a pessoa já passou por ele (ou tentou salvar). */
  invalid(name: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[name];
    return control.invalid && control.touched;
  }

  async saveAuthor(): Promise<void> {
    this.formError.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.formError.set('Falta preencher os campos marcados.');
      // Leva a pessoa até o primeiro campo com problema, em vez de parecer que o botão não fez nada
      setTimeout(() =>
        this.host.nativeElement.querySelector('.error-text')?.closest('.field')?.scrollIntoView({ block: 'center' }),
      );
      return;
    }
    const value = this.form.getRawValue();

    this.saving.set(true);
    this.message.set(null);
    try {
      const request = { ...value, avatar: this.newAvatar };
      const author = this.profile()?.author
        ? await firstValueFrom(this.api.updateAuthor(request))
        : await firstValueFrom(this.api.createAuthor(request));
      this.profile.update((p) => (p ? { ...p, author } : p));
      this.newAvatar = null;
      this.editingAuthor.set(false);
      this.toast.add({ severity: 'success', summary: 'Perfil de autor salvo' });
    } catch (error) {
      this.formError.set(problemMessage(error, 'Não foi possível salvar o perfil.'));
    } finally {
      this.saving.set(false);
    }
  }

  logout(): void {
    void this.auth.logout();
  }
}
