import { signal } from '@angular/core';
import type { JSONContent } from '@tiptap/core';
import { firstValueFrom } from 'rxjs';

import { ManuscriptApi } from '../../../core/api/manuscript.api';
import { isNetworkError, problemMessage, problemOf } from '../../../core/api/problem';
import { Chapter, ChapterVersionSummary } from '../../../core/models/api.models';
import { DraftStore } from '../../../core/util/draft-store';

export type SaveStatus = 'saved' | 'pending' | 'saving' | 'offline' | 'conflict' | 'error';

const SAVE_DEBOUNCE_MS = 2000;
const DRAFT_DEBOUNCE_MS = 400;
const MAX_RETRY_MS = 60_000;

/**
 * Autosave de um capítulo (§9.1 da arquitetura):
 * 1. cada alteração vai primeiro para o IndexedDB (rascunho local), quase imediatamente;
 * 2. depois de 2 s sem digitar, o conteúdo vai para a API com If-Match;
 * 3. sem rede, tenta de novo com espera crescente e assim que o aparelho volta a ficar online;
 * 4. se outro dispositivo salvou antes (409), para e pede uma decisão, sem descartar nada.
 * Operações que mudam a versão (salvar, renomear) passam por uma fila para nunca competirem entre si.
 */
export class ChapterAutosave {
  readonly status = signal<SaveStatus>('saved');
  readonly version = signal(0);
  readonly lastSavedAt = signal<Date | null>(null);
  readonly errorMessage = signal<string | null>(null);

  private editSeq = 0;
  private savedSeq = 0;
  private queue: Promise<unknown> = Promise.resolve();
  private saveTimer?: ReturnType<typeof setTimeout>;
  private draftTimer?: ReturnType<typeof setTimeout>;
  private retryTimer?: ReturnType<typeof setTimeout>;
  private retryDelay = 5000;
  private disposed = false;
  private readonly onOnline = () => void this.flush();

  constructor(
    private readonly chapterId: string,
    initialVersion: number,
    private readonly api: ManuscriptApi,
    private readonly drafts: DraftStore,
    private readonly getContent: () => JSONContent,
  ) {
    this.version.set(initialVersion);
    window.addEventListener('online', this.onOnline);
  }

  /** Chamado a cada alteração do editor. */
  markChanged(): void {
    this.editSeq++;
    if (this.status() !== 'conflict') {
      this.status.set(this.status() === 'offline' ? 'offline' : 'pending');
    }
    clearTimeout(this.draftTimer);
    this.draftTimer = setTimeout(() => void this.writeDraft(), DRAFT_DEBOUNCE_MS);
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => void this.flush(), SAVE_DEBOUNCE_MS);
  }

  /** Salva já (app indo para segundo plano, botão voltar, volta da conexão). */
  flush(): Promise<void> {
    clearTimeout(this.saveTimer);
    clearTimeout(this.retryTimer);
    return this.enqueue(() => this.save());
  }

  hasUnsavedChanges(): boolean {
    return this.editSeq !== this.savedSeq;
  }

  rename(title: string): Promise<void> {
    return this.enqueue(async () => {
      const result = await firstValueFrom(this.api.renameChapter(this.chapterId, title));
      this.version.set(result.version);
    });
  }

  /** Conflito: manter o texto deste aparelho, sobrescrevendo a versão do servidor. */
  keepMine(): Promise<void> {
    return this.enqueue(async () => {
      const server = await firstValueFrom(this.api.getChapter(this.chapterId));
      await this.drafts.backup(this.chapterId, server.content);
      this.version.set(server.version);
      this.savedSeq = -1; // força o envio
      this.status.set('pending');
      await this.save();
    });
  }

  /** Conflito: ficar com a versão do servidor. O texto local é guardado como cópia de segurança. */
  useServer(server: Chapter): Promise<void> {
    return this.enqueue(async () => {
      await this.drafts.backup(this.chapterId, this.getContent());
      await this.drafts.delete(this.chapterId);
      this.version.set(server.version);
      this.savedSeq = this.editSeq;
      this.errorMessage.set(null);
      this.status.set('saved');
    });
  }

  /** "Salvar versão agora": envia o texto pendente antes, para a versão conter o que está na tela. */
  saveNamedVersion(label: string | null): Promise<ChapterVersionSummary> {
    return this.enqueue(async () => {
      await this.save();
      if (this.status() === 'conflict' || this.hasUnsavedChanges()) {
        throw new Error('Resolva o salvamento pendente antes de salvar uma versão.');
      }
      return firstValueFrom(this.api.saveVersion(this.chapterId, label));
    });
  }

  /**
   * Volta para uma versão do histórico. O servidor guarda o estado atual antes (nada se perde);
   * aqui o texto pendente é enviado primeiro e, no fim, o editor adota o conteúdo restaurado.
   */
  restoreVersion(versionId: string): Promise<Chapter> {
    return this.enqueue(async () => {
      await this.save();
      if (this.status() === 'conflict' || this.hasUnsavedChanges()) {
        throw new Error('Resolva o salvamento pendente antes de restaurar uma versão.');
      }
      const restored = await firstValueFrom(this.api.restoreVersion(this.chapterId, versionId, this.version()));
      this.version.set(restored.version);
      this.savedSeq = this.editSeq;
      await this.drafts.delete(this.chapterId);
      this.lastSavedAt.set(new Date());
      this.status.set('saved');
      return restored;
    });
  }

  /** Abriu o capítulo com um rascunho local mais novo que o servidor: agenda o envio. */
  resumeUnsyncedDraft(): void {
    this.savedSeq = -1;
    this.status.set('pending');
    this.saveTimer = setTimeout(() => void this.flush(), 500);
  }

  enterConflict(): void {
    this.savedSeq = -1;
    this.status.set('conflict');
  }

  dispose(): void {
    this.disposed = true;
    clearTimeout(this.saveTimer);
    clearTimeout(this.draftTimer);
    clearTimeout(this.retryTimer);
    window.removeEventListener('online', this.onOnline);
  }

  private async save(): Promise<void> {
    if (this.status() === 'conflict' || this.editSeq === this.savedSeq) {
      return;
    }

    const seq = this.editSeq;
    const content = this.getContent();
    await this.writeDraft(content);
    this.status.set('saving');

    try {
      const result = await firstValueFrom(this.api.saveChapterContent(this.chapterId, this.version(), content));
      this.version.set(result.version);
      this.savedSeq = seq;
      this.retryDelay = 5000;
      this.errorMessage.set(null);
      this.lastSavedAt.set(new Date());

      if (this.editSeq === seq) {
        await this.drafts.delete(this.chapterId);
        this.status.set('saved');
      } else {
        // continuou digitando durante o envio
        this.status.set('pending');
        this.saveTimer = setTimeout(() => void this.flush(), SAVE_DEBOUNCE_MS);
      }
    } catch (error) {
      this.handleSaveError(error);
    }
  }

  private handleSaveError(error: unknown): void {
    if (problemOf(error)?.status === 409) {
      this.status.set('conflict');
      return;
    }
    if (isNetworkError(error)) {
      this.status.set('offline');
      if (!this.disposed) {
        this.retryTimer = setTimeout(() => void this.flush(), this.retryDelay);
        this.retryDelay = Math.min(this.retryDelay * 2, MAX_RETRY_MS);
      }
      return;
    }
    // O texto continua no rascunho local; o usuário pode tentar de novo
    this.errorMessage.set(problemMessage(error, 'Não foi possível salvar.'));
    this.status.set('error');
  }

  private async writeDraft(content: JSONContent = this.getContent()): Promise<void> {
    clearTimeout(this.draftTimer);
    await this.drafts.put({
      chapterId: this.chapterId,
      content,
      baseVersion: this.version(),
      savedAt: Date.now(),
    });
  }

  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const run = this.queue.then(operation, operation);
    this.queue = run.catch(() => undefined);
    return run;
  }
}
