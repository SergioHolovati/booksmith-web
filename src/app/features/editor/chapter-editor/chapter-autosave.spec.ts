import { HttpErrorResponse } from '@angular/common/http';
import type { JSONContent } from '@tiptap/core';
import { Observable, of, throwError } from 'rxjs';

import { ManuscriptApi } from '../../../core/api/manuscript.api';
import { SaveResult } from '../../../core/models/api.models';
import { ChapterDraft, DraftStore } from '../../../core/util/draft-store';
import { ChapterAutosave } from './chapter-autosave';

class FakeDrafts {
  drafts = new Map<string, ChapterDraft>();
  backups: JSONContent[] = [];
  async get(id: string) {
    return this.drafts.get(id) ?? null;
  }
  async put(draft: ChapterDraft) {
    this.drafts.set(draft.chapterId, draft);
  }
  async delete(id: string) {
    this.drafts.delete(id);
  }
  async backup(_id: string, content: JSONContent) {
    this.backups.push(content);
  }
}

const saved = (version: number): SaveResult => ({ version, wordCount: 1, contentHash: 'h', updatedAt: '' });
const httpError = (status: number) => new HttpErrorResponse({ status, error: status ? { status } : null });

describe('ChapterAutosave', () => {
  let drafts: FakeDrafts;
  let responses: (() => Observable<SaveResult>)[];
  let calls: { version: number; content: JSONContent }[];
  let restoreCalls: { versionId: string; currentVersion: number }[];
  let content: JSONContent;
  let autosave: ChapterAutosave;

  beforeEach(() => {
    vi.useFakeTimers();
    drafts = new FakeDrafts();
    responses = [];
    calls = [];
    restoreCalls = [];
    content = { type: 'doc', content: [] };
    const api = {
      saveChapterContent: (_id: string, version: number, body: JSONContent) => {
        calls.push({ version, content: body });
        return (responses.shift() ?? (() => of(saved(version + 1))))();
      },
      restoreVersion: (_id: string, versionId: string, currentVersion: number) => {
        restoreCalls.push({ versionId, currentVersion });
        return of({ id: 'c1', version: currentVersion + 1, content: { type: 'doc', content: [] } });
      },
    } as unknown as ManuscriptApi;
    autosave = new ChapterAutosave('c1', 3, api, drafts as unknown as DraftStore, () => content);
  });

  afterEach(() => {
    autosave.dispose();
    vi.useRealTimers();
  });

  it('grava o rascunho local logo e envia depois de 2 s sem digitar', async () => {
    autosave.markChanged();
    await vi.advanceTimersByTimeAsync(500);
    expect(drafts.drafts.get('c1')?.baseVersion).toBe(3);
    expect(calls).toHaveLength(0);

    await vi.advanceTimersByTimeAsync(1600);
    expect(calls).toEqual([{ version: 3, content }]);
    expect(autosave.version()).toBe(4);
    expect(autosave.status()).toBe('saved');
    expect(drafts.drafts.has('c1')).toBe(false);
  });

  it('em conflito (409) para e mantém o rascunho', async () => {
    responses.push(() => throwError(() => httpError(409)));
    autosave.markChanged();
    await autosave.flush();

    expect(autosave.status()).toBe('conflict');
    expect(drafts.drafts.has('c1')).toBe(true);

    autosave.markChanged();
    await vi.advanceTimersByTimeAsync(5000);
    expect(calls).toHaveLength(1); // não tenta sobrescrever sozinho
  });

  it('sem rede fica offline, mantém o rascunho e tenta de novo', async () => {
    responses.push(() => throwError(() => httpError(0)));
    autosave.markChanged();
    await autosave.flush();
    expect(autosave.status()).toBe('offline');
    expect(drafts.drafts.has('c1')).toBe(true);

    await vi.advanceTimersByTimeAsync(5000);
    expect(calls).toHaveLength(2);
    expect(autosave.status()).toBe('saved');
  });

  it('se o usuário digitou durante o envio, envia de novo em seguida', async () => {
    let finishFirst!: () => void;
    responses.push(
      () =>
        new Observable<SaveResult>((subscriber) => {
          finishFirst = () => {
            subscriber.next(saved(4));
            subscriber.complete();
          };
        }),
    );

    autosave.markChanged();
    const firstSave = autosave.flush();
    await vi.advanceTimersByTimeAsync(0);
    autosave.markChanged(); // digitou enquanto salvava
    finishFirst();
    await firstSave;

    expect(autosave.status()).toBe('pending');
    expect(drafts.drafts.has('c1')).toBe(true);

    await vi.advanceTimersByTimeAsync(2100);
    expect(calls.map((c) => c.version)).toEqual([3, 4]);
    expect(autosave.status()).toBe('saved');
  });

  it('restaurar versão envia antes o texto pendente e adota a versão restaurada', async () => {
    autosave.markChanged(); // digitou e ainda não salvou

    const restored = await autosave.restoreVersion('v-antiga');

    // 1º salvou o texto pendente (3 → 4), 2º restaurou a partir da versão 4
    expect(calls.map((c) => c.version)).toEqual([3]);
    expect(restoreCalls).toEqual([{ versionId: 'v-antiga', currentVersion: 4 }]);
    expect(restored.version).toBe(5);
    expect(autosave.version()).toBe(5);
    expect(autosave.status()).toBe('saved');
    expect(drafts.drafts.has('c1')).toBe(false);
  });

  it('não restaura enquanto houver conflito sem resolver', async () => {
    responses.push(() => throwError(() => httpError(409)));
    autosave.markChanged();

    await expect(autosave.restoreVersion('v-antiga')).rejects.toThrow(/salvamento pendente/);
    expect(restoreCalls).toEqual([]);
  });
});
