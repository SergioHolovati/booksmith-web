import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import type { Editor } from '@tiptap/core';
import { firstValueFrom } from 'rxjs';

import { ManuscriptApi } from '../../../core/api/manuscript.api';
import { ProofreadIssue } from '../../../core/models/api.models';
import { BlockText, PlacedIssue, blockTexts, placeIssues, proofreadKey } from './proofread';

export const PROOFREAD_DELAY_MS = 1500;
const MAX_BLOCKS = 60;
const MAX_CHARS = 38_000;
const MAX_BLOCK_CHARS = 5_000;

/** Divide os parágrafos em lotes que cabem numa chamada (mesmos limites da API). */
export function chunks(blocks: BlockText[]): BlockText[][] {
  const result: BlockText[][] = [];
  let current: BlockText[] = [];
  let size = 0;
  for (const block of blocks) {
    if (block.text.length > MAX_BLOCK_CHARS) {
      continue; // parágrafo gigante (colado de outro lugar): fica sem correção
    }
    if (current.length === MAX_BLOCKS || size + block.text.length > MAX_CHARS) {
      result.push(current);
      current = [];
      size = 0;
    }
    current.push(block);
    size += block.text.length;
  }
  if (current.length) {
    result.push(current);
  }
  return result;
}

/**
 * Corretor do editor (§8.5, etapa 2). Depois de uma pausa na digitação, manda só os parágrafos cujo texto mudou
 * desde a última correção. Se o serviço não responder, desliga em silêncio e o corretor do navegador volta.
 */
export class Proofreader {
  /** Ligado depois da primeira correção que deu certo. */
  readonly active = signal(false);

  private readonly checked = new Map<string, string>();
  private readonly issues = new Map<string, ProofreadIssue[]>();
  private readonly ignored = new Set<string>();
  private readonly acceptedWords = new Set<string>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private running = false;
  private again = false;
  private disabled = false;

  constructor(
    private readonly editor: Editor,
    private readonly chapterId: string,
    private readonly api: ManuscriptApi,
    private readonly onAvailabilityChange: (available: boolean) => void,
  ) {}

  schedule(delay = PROOFREAD_DELAY_MS): void {
    if (this.disabled) {
      return;
    }
    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.timer = setTimeout(() => void this.run(), delay);
  }

  destroy(): void {
    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.disabled = true;
  }

  /** "Ignorar": só esta ocorrência, até fechar o capítulo. */
  ignore(issue: PlacedIssue): void {
    this.ignored.add(ignoreKey(issue));
    this.redraw();
  }

  /** Depois de "Adicionar ao dicionário do livro": a palavra some de todos os parágrafos na hora. */
  accept(word: string): void {
    this.acceptedWords.add(word.toLocaleLowerCase());
    this.redraw();
  }

  /** Troca o trecho pela sugestão; o parágrafo é corrigido de novo depois. */
  apply(issue: PlacedIssue, replacement: string): void {
    const { state, view } = this.editor;
    if (state.doc.textBetween(issue.from, issue.to) !== issue.word) {
      return; // o texto mudou desde a correção
    }
    view.dispatch(state.tr.insertText(replacement, issue.from, issue.to));
    this.editor.commands.focus();
  }

  private async run(): Promise<void> {
    if (this.running) {
      this.again = true;
      return;
    }
    this.running = true;
    try {
      const blocks = blockTexts(this.editor.state.doc);
      const alive = new Set(blocks.map((b) => b.id));
      for (const id of [...this.checked.keys()]) {
        if (!alive.has(id)) {
          this.checked.delete(id);
          this.issues.delete(id);
        }
      }
      const changed = blocks.filter((b) => this.checked.get(b.id) !== b.text);
      for (const batch of chunks(changed)) {
        const response = await firstValueFrom(
          this.api.proofread(this.chapterId, batch.map((b) => ({ id: b.id, text: b.text }))),
        );
        const sent = new Map(batch.map((b) => [b.id, b.text]));
        for (const result of response.blocks) {
          this.checked.set(result.id, sent.get(result.id) ?? '');
          this.issues.set(result.id, result.issues);
        }
        if (!this.active()) {
          this.active.set(true);
          this.onAvailabilityChange(true);
        }
      }
      this.redraw();
    } catch (error) {
      const status = error instanceof HttpErrorResponse ? error.status : 0;
      if (status === 429) {
        this.schedule(10_000); // devagar: tenta de novo daqui a pouco
      } else if (status === 0 || status === 503) {
        this.disabled = true;
        this.active.set(false);
        this.onAvailabilityChange(false);
        this.editor.view.dispatch(this.editor.state.tr.setMeta(proofreadKey, []));
      }
    } finally {
      this.running = false;
      if (this.again) {
        this.again = false;
        this.schedule(300);
      }
    }
  }

  /** Redesenha os sublinhados dos parágrafos cujo texto é exatamente o que foi corrigido. */
  private redraw(): void {
    const placed: PlacedIssue[] = [];
    for (const block of blockTexts(this.editor.state.doc)) {
      if (this.checked.get(block.id) !== block.text) {
        continue; // mudou depois da correção: espera a próxima
      }
      placed.push(
        ...placeIssues(block, this.issues.get(block.id) ?? []).filter(
          (i) => !this.ignored.has(ignoreKey(i)) && !(i.type === 'spelling' && this.acceptedWords.has(i.word.toLocaleLowerCase())),
        ),
      );
    }
    this.editor.view.dispatch(this.editor.state.tr.setMeta(proofreadKey, placed).setMeta('addToHistory', false));
  }
}

function ignoreKey(issue: PlacedIssue): string {
  return `${issue.blockId}|${issue.ruleId}|${issue.word}`;
}
