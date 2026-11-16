import { Component, computed, inject, input, model, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { firstValueFrom } from 'rxjs';

import { IllustrationApi } from '../../core/api/illustration.api';
import { problemMessage } from '../../core/api/problem';
import { UniverseApi } from '../../core/api/universe.api';
import {
  CharacterSummary,
  IllustrationKind,
  IllustrationResult,
  IllustrationStatus,
  IllustrationStyle,
  PlaceSummary,
} from '../../core/models/api.models';
import {
  ART_STYLES,
  BACKGROUNDS,
  DETAILS,
  EXPRESSIONS,
  FORMATS,
  FRAMINGS,
  MAX_EXTRA,
  MAX_SCENE,
  MAX_SCENE_CHARACTERS,
  MAX_SUBJECT,
  MOODS,
  PALETTES,
  SHOTS,
  TIMES,
  nextSlot,
  saveStyle,
  savedStyle,
} from './illustration-options';

/**
 * Estúdio Visual (§4.8): gera com IA o retrato de um personagem (a partir da aparência da ficha), a cena de um
 * capítulo (com o lugar do universo e os retratos dos personagens como referência) ou a arte da capa de um livro
 * concluído (sem letras; o título entra no editor de capa). Tudo o que o formulário pede vira texto estruturado no
 * servidor: nenhum modelo de texto participa. O estilo fica guardado por universo, para as imagens saírem coerentes.
 */
@Component({
  selector: 'app-illustration-studio',
  imports: [FormsModule, ButtonModule, DialogModule, MessageModule, ProgressSpinnerModule],
  templateUrl: './illustration-studio.html',
  styleUrl: './illustration-studio.scss',
})
export class IllustrationStudioComponent {
  private readonly api = inject(IllustrationApi);
  private readonly universes = inject(UniverseApi);

  readonly visible = model(false);
  readonly kind = input.required<IllustrationKind>();
  readonly universeId = input.required<string | null>();
  /** Retrato: o personagem. */
  readonly characterId = input<string | null>(null);
  readonly characterName = input<string | null>(null);
  /** Capa: o livro (precisa estar concluído). */
  readonly bookId = input<string | null>(null);
  readonly bookTitle = input<string | null>(null);
  readonly generated = output<IllustrationResult>();

  readonly arts = ART_STYLES;
  readonly palettes = PALETTES;
  readonly details = DETAILS;
  readonly backgrounds = BACKGROUNDS;
  readonly framings = FRAMINGS;
  readonly expressions = EXPRESSIONS;
  readonly formats = FORMATS;
  readonly times = TIMES;
  readonly moods = MOODS;
  readonly shots = SHOTS;
  readonly maxScene = MAX_SCENE;
  readonly maxSubject = MAX_SUBJECT;
  readonly maxExtra = MAX_EXTRA;
  readonly maxCharacters = MAX_SCENE_CHARACTERS;

  readonly status = signal<IllustrationStatus | null>(null);
  readonly characters = signal<CharacterSummary[]>([]);
  readonly places = signal<PlaceSummary[]>([]);
  readonly style = signal<IllustrationStyle>(savedStyle(''));
  readonly chosen = signal<string[]>([]);
  readonly placeId = signal<string | null>(null);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly result = signal<IllustrationResult | null>(null);

  framing = 'half';
  expression = 'neutral';
  format = 'opening';
  timeOfDay = '';
  mood = '';
  shot = '';
  scene = '';
  subject = '';
  extra = '';
  setAsPortrait = true;

  readonly limitReached = computed(() => (this.status()?.remaining ?? 1) <= 0);
  readonly nextSlotText = computed(() => nextSlot(this.status()?.nextAt ?? null));
  readonly title = computed(() => {
    switch (this.kind()) {
      case 'portrait': return 'Retrato com IA';
      case 'cover': return 'Arte da capa com IA';
      default: return 'Ilustração da cena com IA';
    }
  });

  async open(): Promise<void> {
    const universeId = this.universeId();
    if (!universeId) {
      return;
    }
    this.style.set(savedStyle(universeId));
    this.result.set(null);
    this.error.set(null);
    try {
      this.status.set(await firstValueFrom(this.api.status()));
      if (this.kind() !== 'portrait') {
        this.characters.set(await firstValueFrom(this.universes.listCharacters(universeId)));
      }
      if (this.kind() === 'scene') {
        this.places.set(await firstValueFrom(this.universes.listPlaces(universeId)));
      }
    } catch (error) {
      this.error.set(problemMessage(error, 'Não foi possível abrir o Estúdio.'));
    }
  }

  setStyle(change: Partial<IllustrationStyle>): void {
    this.style.update((s) => ({ ...s, ...change }));
  }

  toggleCharacter(id: string): void {
    this.chosen.update((list) => {
      if (list.includes(id)) {
        return list.filter((c) => c !== id);
      }
      return list.length >= MAX_SCENE_CHARACTERS ? list : [...list, id];
    });
  }

  togglePlace(id: string): void {
    this.placeId.update((current) => (current === id ? null : id));
  }

  /** Um chip opcional: tocar de novo desmarca. */
  toggle(field: 'timeOfDay' | 'mood' | 'shot', value: string): void {
    this[field] = this[field] === value ? '' : value;
  }

  canGenerate(): boolean {
    if (this.busy() || this.limitReached() || !this.status()?.enabled) {
      return false;
    }
    switch (this.kind()) {
      case 'portrait': return !!this.characterId();
      case 'cover': return !!this.bookId() && this.subject.trim().length > 0;
      default: return this.scene.trim().length > 0;
    }
  }

  async generate(): Promise<void> {
    const universeId = this.universeId();
    if (!universeId || !this.canGenerate()) {
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    saveStyle(universeId, this.style());
    const kind = this.kind();
    try {
      const result = await firstValueFrom(
        this.api.generate({
          ...this.style(),
          kind,
          universeId,
          characterId: kind === 'portrait' ? this.characterId() : null,
          characterIds: kind === 'portrait' ? [] : this.chosen(),
          scene: kind === 'scene' ? this.scene.trim() : null,
          format: kind === 'scene' ? this.format : null,
          placeId: kind === 'scene' ? this.placeId() : null,
          timeOfDay: kind === 'scene' ? this.timeOfDay || null : null,
          shot: kind === 'scene' ? this.shot || null : null,
          mood: kind === 'portrait' ? null : this.mood || null,
          framing: kind === 'portrait' ? this.framing : null,
          expression: kind === 'portrait' ? this.expression : null,
          bookId: kind === 'cover' ? this.bookId() : null,
          subject: kind === 'cover' ? this.subject.trim() : null,
          extra: this.extra.trim() || null,
          setAsPortrait: kind === 'portrait' && this.setAsPortrait,
        }),
      );
      this.result.set(result);
      this.status.update((s) => (s ? { ...s, remaining: result.remaining } : s));
      this.generated.emit(result);
    } catch (error) {
      this.error.set(problemMessage(error, 'Não foi possível gerar a ilustração.'));
    } finally {
      this.busy.set(false);
    }
  }

  close(): void {
    this.visible.set(false);
  }
}
