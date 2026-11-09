import { Component, computed, effect, inject, input, model, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { generateHTML } from '@tiptap/core';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { firstValueFrom } from 'rxjs';

import { ManuscriptApi } from '../../../core/api/manuscript.api';
import { problemMessage } from '../../../core/api/problem';
import { ChapterVersionDetail, ChapterVersionSummary, VersionReason } from '../../../core/models/api.models';
import { formatCount } from '../../../core/util/word-count';
import { manuscriptExtensions } from '../schema/manuscript-extensions';

/** Operações que passam pela fila do autosave (o editor é quem sabe o texto atual e a versão). */
export interface HistoryActions {
  saveVersion(label: string | null): Promise<unknown>;
  restore(versionId: string): Promise<unknown>;
}

const REASON_LABEL: Record<VersionReason, string> = {
  AUTOMATIC: 'Salva automaticamente',
  MANUAL: 'Versão salva por você',
  BEFORE_RESTORE: 'Antes de restaurar uma versão',
};

const PREVIEW_EXTENSIONS = manuscriptExtensions('');

@Component({
  selector: 'app-chapter-history',
  imports: [FormsModule, ButtonModule, DrawerModule, InputTextModule, ProgressSpinnerModule],
  templateUrl: './chapter-history.html',
  styleUrl: './chapter-history.scss',
})
export class ChapterHistoryComponent {
  private readonly api = inject(ManuscriptApi);

  readonly chapterId = input.required<string>();
  readonly actions = input.required<HistoryActions>();
  readonly visible = model(false);

  readonly versions = signal<ChapterVersionSummary[]>([]);
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly message = signal<string | null>(null);
  readonly preview = signal<ChapterVersionDetail | null>(null);
  label = '';

  readonly previewHtml = computed(() => {
    const version = this.preview();
    return version ? generateHTML(version.content, PREVIEW_EXTENSIONS) : '';
  });

  readonly formatCount = formatCount;

  constructor() {
    effect(() => {
      if (this.visible()) {
        this.preview.set(null);
        void this.load();
      }
    });
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.message.set(null);
    try {
      this.versions.set(await firstValueFrom(this.api.listVersions(this.chapterId())));
    } catch (error) {
      this.message.set(problemMessage(error, 'Não foi possível carregar o histórico.'));
    } finally {
      this.loading.set(false);
    }
  }

  async open(version: ChapterVersionSummary): Promise<void> {
    this.busy.set(true);
    try {
      this.preview.set(await firstValueFrom(this.api.getVersion(this.chapterId(), version.id)));
    } catch (error) {
      this.message.set(problemMessage(error, 'Não foi possível abrir a versão.'));
    } finally {
      this.busy.set(false);
    }
  }

  async saveNow(): Promise<void> {
    await this.run(async () => {
      await this.actions().saveVersion(this.label.trim() || null);
      this.label = '';
      await this.load();
    });
  }

  async restore(version: ChapterVersionDetail): Promise<void> {
    await this.run(async () => {
      await this.actions().restore(version.id);
      this.visible.set(false);
    });
  }

  title(version: ChapterVersionSummary): string {
    return version.reason === 'MANUAL' && version.label ? version.label : REASON_LABEL[version.reason];
  }

  when(iso: string): string {
    const date = new Date(iso);
    const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (date.toDateString() === today.toDateString()) {
      return `Hoje às ${time}`;
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return `Ontem às ${time}`;
    }
    return `${date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })} às ${time}`;
  }

  private async run(operation: () => Promise<void>): Promise<void> {
    this.busy.set(true);
    this.message.set(null);
    try {
      await operation();
    } catch (error) {
      this.message.set(error instanceof Error && !('status' in error) ? error.message : problemMessage(error));
    } finally {
      this.busy.set(false);
    }
  }
}
