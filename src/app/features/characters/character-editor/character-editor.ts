import { Component, HostListener, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TextareaModule } from 'primeng/textarea';
import { firstValueFrom } from 'rxjs';

import { problemMessage, problemOf } from '../../../core/api/problem';
import { UniverseApi } from '../../../core/api/universe.api';
import {
  AppearanceField,
  AppearanceFormDefinition,
  AppearanceTab,
  AppearanceValue,
  AppearanceValues,
  Character,
  CharacterRole,
  CharacterSheet, Portrait } from '../../../core/models/api.models';
import { HasUnsavedChanges } from '../../../core/util/unsaved-changes.guard';
import { BuilderFieldComponent } from '../../../shared/builder/builder-field';
import { ImageGalleryComponent } from '../../../shared/gallery/image-gallery';
import { RelationsCardComponent } from '../relations-card/relations-card';
import { describe, progress, rollEmpty, stableJson, tabsOf, withValue } from '../appearance-values';
import { ROLE_OPTIONS, SHEET_FIELDS } from '../character-labels';
import { MentionedInComponent } from '../../../shared/mentions/mentioned-in';

type Section = 'sheet' | 'appearance' | 'personality';

interface Draft {
  name: string;
  aliases: string[];
  sheet: CharacterSheet;
  appearance: AppearanceValues;
}

/**
 * Montador do personagem, como nos jogos: "Ficha" (papel, história, segredos), "Aparência" e "Personalidade",
 * as duas últimas montadas a partir da definição que vem da API. Nada é obrigatório; o retrato em texto
 * mostra ao vivo o que já foi definido. Salva tudo de uma vez; sair com alterações pendentes pede confirmação.
 */
@Component({
  selector: 'app-character-editor',
  imports: [
    RouterLink,
    FormsModule,
    AutoCompleteModule,
    ButtonModule,
    ConfirmDialogModule,
    InputTextModule,
    MessageModule,
    ProgressSpinnerModule,
    SelectButtonModule,
    TextareaModule,
    BuilderFieldComponent,
    RelationsCardComponent,
    ImageGalleryComponent,
    MentionedInComponent,
  ],
  providers: [ConfirmationService],
  templateUrl: './character-editor.html',
  styleUrl: './character-editor.scss',
})
export class CharacterEditorComponent implements HasUnsavedChanges {
  private readonly api = inject(UniverseApi);
  private readonly router = inject(Router);
  private readonly toast = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);

  readonly bookId = input.required<string>();
  readonly characterId = input.required<string>();

  readonly character = signal<Character | null>(null);
  readonly form = signal<AppearanceFormDefinition | null>(null);
  readonly draft = signal<Draft>({ name: '', aliases: [], sheet: {}, appearance: {} });
  private readonly saved = signal('');

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly conflict = signal(false);
  readonly section = signal<Section>('sheet');
  readonly tabKey = signal<string | null>(null);

  readonly dirty = computed(() => this.character() !== null && stableJson(this.draft()) !== this.saved());
  /** Abas da seção aberta (Aparência ou Personalidade). */
  readonly groupTabs = computed<AppearanceTab[]>(() => {
    const form = this.form();
    const section = this.section();
    return form && section !== 'sheet' ? tabsOf(form, section) : [];
  });
  readonly tab = computed<AppearanceTab | null>(() => {
    const tabs = this.groupTabs();
    return tabs.find((t) => t.key === this.tabKey()) ?? tabs.at(0) ?? null;
  });
  /** O que já foi definido na seção, em texto: confere-se ao vivo e vira a base da ilustração. */
  readonly portrait = computed(() => describe(this.groupTabs(), this.draft().appearance));
  readonly progress = computed(() => progress(this.groupTabs(), this.draft().appearance));
  readonly nextTab = computed(() => {
    const tabs = this.groupTabs();
    const index = tabs.findIndex((t) => t.key === this.tab()?.key);
    return index >= 0 && index < tabs.length - 1 ? tabs[index + 1] : null;
  });
  /** Quantos campos de cada aba já foram preenchidos (mostrado nas abas). */
  readonly filledByTab = computed(() => {
    const values = this.draft().appearance;
    return Object.fromEntries(
      (this.form()?.tabs ?? []).map((t) => [t.key, t.fields.filter((f) => values[f.key] !== undefined).length]),
    );
  });

  readonly sections = [
    { label: 'Ficha', value: 'sheet' },
    { label: 'Aparência', value: 'appearance' },
    { label: 'Personalidade', value: 'personality' },
  ];
  readonly roleOptions = ROLE_OPTIONS;
  readonly sheetFields = SHEET_FIELDS;

  constructor() {
    // Recarrega quando o personagem da rota muda: indo de uma ficha para outra (pelo link de uma relação), o
    // Angular reaproveita este componente e só troca o id
    effect(() => {
      this.characterId();
      untracked(() => void this.load());
    });
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.dirty()) {
      event.preventDefault();
    }
  }

  hasUnsavedChanges(): boolean {
    return this.dirty();
  }

  /** O retrato mudou na galeria: só a imagem do topo muda; a ficha em edição continua como está. */
  onPortrait(portrait: Portrait): void {
    this.character.update((c) => (c ? { ...c, portraitId: portrait.imageId, portraitUrl: portrait.url } : c));
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    this.conflict.set(false);
    try {
      const [character, form] = await Promise.all([
        firstValueFrom(this.api.getCharacter(this.characterId())),
        firstValueFrom(this.api.appearanceForm()),
      ]);
      this.form.set(form);
      this.reset(character);
    } catch (error) {
      this.error.set(problemMessage(error, 'Não foi possível abrir o personagem.'));
    } finally {
      this.loading.set(false);
    }
  }

  private reset(character: Character): void {
    this.character.set(character);
    const draft: Draft = {
      name: character.name,
      aliases: [...character.aliases],
      sheet: { ...character.sheet },
      appearance: { ...character.appearance },
    };
    this.draft.set(draft);
    this.saved.set(stableJson(draft));
  }

  // ===== Ficha =====

  setName(name: string): void {
    this.draft.update((d) => ({ ...d, name }));
  }

  setAliases(aliases: string[] | null): void {
    this.draft.update((d) => ({ ...d, aliases: aliases ?? [] }));
  }

  setRole(role: CharacterRole): void {
    this.setSheet('role', this.draft().sheet.role === role ? '' : role);
  }

  setSheet(key: keyof CharacterSheet, value: string): void {
    this.draft.update((d) => {
      const sheet = { ...d.sheet } as Record<string, string>;
      if (value.trim() === '') {
        delete sheet[key];
      } else {
        sheet[key] = value;
      }
      return { ...d, sheet: sheet as CharacterSheet };
    });
  }

  selectSection(section: Section): void {
    this.section.set(section);
    this.tabKey.set(null);
  }

  /** Dado: sorteia só o que está vazio na aba. */
  roll(tab: AppearanceTab): void {
    this.setAppearance((values) => rollEmpty(tab, values));
  }

  // ===== Aparência e personalidade =====

  value(field: AppearanceField): AppearanceValue | undefined {
    return this.draft().appearance[field.key];
  }

  private setAppearance(update: (values: AppearanceValues) => AppearanceValues): void {
    this.draft.update((d) => ({ ...d, appearance: update(d.appearance) }));
  }

  setValue(field: AppearanceField, value: AppearanceValue | null): void {
    this.setAppearance((values) => withValue(values, field.key, value));
  }

  // ===== Salvar =====

  async save(): Promise<void> {
    const character = this.character();
    const draft = this.draft();
    if (!character || !draft.name.trim()) {
      return;
    }
    this.saving.set(true);
    try {
      const saved = await firstValueFrom(
        this.api.updateCharacter(character.id, { version: character.version, ...draft }),
      );
      this.reset(saved);
      this.toast.add({ severity: 'success', summary: 'Personagem salvo', life: 2500 });
    } catch (error) {
      if (problemOf(error)?.code === 'character_version_conflict') {
        this.conflict.set(true);
      } else {
        this.toast.add({ severity: 'error', summary: problemMessage(error), life: 6000 });
      }
    } finally {
      this.saving.set(false);
    }
  }

  discard(): void {
    const character = this.character();
    if (character) {
      this.reset(character);
    }
  }

  confirmDelete(): void {
    const character = this.character();
    if (!character) {
      return;
    }
    this.confirm.confirm({
      header: 'Excluir personagem?',
      message: `A ficha de ${character.name} vai para a lixeira, onde fica 30 dias. O texto do livro não muda.`,
      acceptLabel: 'Excluir',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text p-button-secondary',
      accept: () => void this.delete(character),
    });
  }

  private async delete(character: Character): Promise<void> {
    try {
      await firstValueFrom(this.api.deleteCharacter(character.id));
      this.saved.set(stableJson(this.draft())); // nada a perguntar ao sair
      this.toast.add({ severity: 'success', summary: `${character.name} foi excluído`, life: 3000 });
      await this.router.navigate(['/books', this.bookId(), 'characters']);
    } catch (error) {
      this.toast.add({ severity: 'error', summary: problemMessage(error) });
    }
  }
}
