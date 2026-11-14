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
  PALETTES,
  nextSlot,
  saveStyle,
  savedStyle,
} from './illustration-options';

/**
 * Estúdio Visual (§4.8): gera com IA o retrato de um personagem (a partir da aparência da ficha) ou a cena de um
 * capítulo (com os retratos dos personagens como referência). O estilo fica guardado por universo, para as
 * ilustrações saírem coerentes. A imagem volta já guardada na biblioteca, marcada como IA.
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
  readonly generated = output<IllustrationResult>();

  readonly arts = ART_STYLES;
  readonly palettes = PALETTES;
  readonly details = DETAILS;
  readonly backgrounds = BACKGROUNDS;
  readonly framings = FRAMINGS;
  readonly expressions = EXPRESSIONS;
  readonly formats = FORMATS;
  readonly maxScene = MAX_SCENE;
  readonly maxExtra = MAX_EXTRA;
  readonly maxCharacters = MAX_SCENE_CHARACTERS;

  readonly status = signal<IllustrationStatus | null>(null);
  readonly characters = signal<CharacterSummary[]>([]);
  readonly style = signal<IllustrationStyle>(savedStyle(''));
  readonly chosen = signal<string[]>([]);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly result = signal<IllustrationResult | null>(null);

  framing = 'half';
  expression = 'neutral';
  format = 'opening';
  scene = '';
  extra = '';
  setAsPortrait = true;

  readonly limitReached = computed(() => (this.status()?.remaining ?? 1) <= 0);
  readonly nextSlotText = computed(() => nextSlot(this.status()?.nextAt ?? null));

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
      if (this.kind() === 'scene') {
        this.characters.set(await firstValueFrom(this.universes.listCharacters(universeId)));
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

  canGenerate(): boolean {
    if (this.busy() || this.limitReached() || !this.status()?.enabled) {
      return false;
    }
    return this.kind() === 'portrait' ? !!this.characterId() : this.scene.trim().length > 0;
  }

  async generate(): Promise<void> {
    const universeId = this.universeId();
    if (!universeId || !this.canGenerate()) {
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    saveStyle(universeId, this.style());
    try {
      const portrait = this.kind() === 'portrait';
      const result = await firstValueFrom(
        this.api.generate({
          ...this.style(),
          kind: this.kind(),
          universeId,
          characterId: portrait ? this.characterId() : null,
          characterIds: portrait ? [] : this.chosen(),
          scene: portrait ? null : this.scene.trim(),
          format: portrait ? null : this.format,
          framing: portrait ? this.framing : null,
          expression: portrait ? this.expression : null,
          extra: this.extra.trim() || null,
          setAsPortrait: portrait && this.setAsPortrait,
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
