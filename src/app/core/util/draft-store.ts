import { Injectable } from '@angular/core';
import type { JSONContent } from '@tiptap/core';

/**
 * Rascunho local de cada capítulo no IndexedDB. Todo texto digitado é gravado aqui antes de ir para a API,
 * então nada se perde com a rede caindo, a aba fechando ou o celular descarregando (§9.1 da arquitetura).
 */
export interface ChapterDraft {
  chapterId: string;
  content: JSONContent;
  /** Versão do servidor sobre a qual o rascunho foi escrito. */
  baseVersion: number;
  savedAt: number;
}

export interface ConflictBackup {
  id: string;
  chapterId: string;
  content: JSONContent;
  savedAt: number;
}

const DB_NAME = 'booksmith';
const DB_VERSION = 1;
const DRAFTS = 'chapter-drafts';
const BACKUPS = 'conflict-backups';

@Injectable({ providedIn: 'root' })
export class DraftStore {
  private db: Promise<IDBDatabase | null> | null = null;

  async get(chapterId: string): Promise<ChapterDraft | null> {
    return (await this.request<ChapterDraft>(DRAFTS, 'readonly', (store) => store.get(chapterId))) ?? null;
  }

  async put(draft: ChapterDraft): Promise<void> {
    await this.request(DRAFTS, 'readwrite', (store) => store.put(draft));
  }

  async delete(chapterId: string): Promise<void> {
    await this.request(DRAFTS, 'readwrite', (store) => store.delete(chapterId));
  }

  /** Guarda uma cópia antes de descartar texto local num conflito. */
  async backup(chapterId: string, content: JSONContent): Promise<void> {
    const backup: ConflictBackup = { id: `${chapterId}:${Date.now()}`, chapterId, content, savedAt: Date.now() };
    await this.request(BACKUPS, 'readwrite', (store) => store.put(backup));
  }

  private async request<T>(
    storeName: string,
    mode: IDBTransactionMode,
    operation: (store: IDBObjectStore) => IDBRequest,
  ): Promise<T | undefined> {
    const db = await this.open();
    if (!db) {
      return undefined;
    }
    return new Promise<T | undefined>((resolve, reject) => {
      const request = operation(db.transaction(storeName, mode).objectStore(storeName));
      request.onsuccess = () => resolve(request.result as T);
      request.onerror = () => reject(request.error);
    });
  }

  /** null quando o IndexedDB não está disponível (ex.: modo privado de alguns navegadores). */
  private open(): Promise<IDBDatabase | null> {
    this.db ??= new Promise((resolve) => {
      if (typeof indexedDB === 'undefined') {
        resolve(null);
        return;
      }
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        request.result.createObjectStore(DRAFTS, { keyPath: 'chapterId' });
        request.result.createObjectStore(BACKUPS, { keyPath: 'id' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    });
    return this.db;
  }
}
