import { Component, computed, inject, input, model, signal } from '@angular/core';
import type { Editor } from '@tiptap/core';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { ProgressBarModule } from 'primeng/progressbar';
import { firstValueFrom } from 'rxjs';

import { AssistApi } from '../../../core/api/assist.api';
import { problemMessage } from '../../../core/api/problem';
import { ReviewCheck, ReviewItem, ReviewResult } from '../../../core/models/api.models';
import { findQuote } from './find-quote';

/** As revisões, na ordem da tela. */
export const REVIEW_CHECKS: { value: ReviewCheck; label: string; help: string }[] = [
  { value: 'spelling', label: 'Ortografia', help: 'Erros de ortografia, acentuação, concordância, crase e pontuação.' },
  { value: 'holes', label: 'Furos de roteiro', help: 'O que não se sustenta: causas que faltam, quem sabe o que não devia.' },
  { value: 'continuity', label: 'Continuidade', help: 'O que contradiz as fichas ou os capítulos anteriores.' },
  { value: 'improvements', label: 'Melhorias no enredo', help: 'Ritmo, tensão, ganchos e conflitos que poderiam render mais.' },
];

interface ReviewView extends ReviewItem {
  /** Ortografia corrigida ou apontamento dispensado: sai da lista. */
  done: boolean;
}

/**
 * "Revisão da IA" no editor: ortografia, furos de roteiro, continuidade e melhorias no enredo. A IA aponta e o
 * autor decide: "Ir ao trecho" seleciona o lugar no texto; na ortografia, "Corrigir" troca só aquele trecho (e
 * dá para desfazer). Capítulos longos vão em partes, com o andamento na tela; o que estiver por salvar é salvo
 * antes, porque a revisão lê o texto do servidor.
 */
@Component({
  selector: 'app-chapter-review',
  imports: [ButtonModule, DrawerModule, ProgressBarModule],
  templateUrl: './chapter-review.html',
  styleUrl: './chapter-review.scss',
})
export class ChapterReviewComponent {
  private readonly api = inject(AssistApi);
  private readonly toast = inject(MessageService);

  readonly chapterId = input.required<string>();
  readonly bookId = input<string | null>(null);
  readonly editor = input<Editor | null>(null);
  /** Salva o que estiver pendente no editor antes de revisar. */
  readonly flush = input<() => Promise<void>>(() => Promise.resolve());
  readonly visible = model(false);

  readonly checks = REVIEW_CHECKS;
  readonly check = signal<ReviewCheck>('spelling');
  readonly running = signal(false);
  readonly progress = signal<{ part: number; parts: number } | null>(null);
  readonly error = signal<string | null>(null);
  readonly items = signal<ReviewView[]>([]);
  /** Qual revisão gerou a lista atual (a escolha pode mudar depois). */
  readonly reviewed = signal<ReviewCheck | null>(null);
  readonly finished = signal(false);
  private cancelled = false;

  readonly status = this.api.status;
  readonly pending = computed(() => this.items().filter((i) => !i.done));
  readonly helpText = computed(() => REVIEW_CHECKS.find((c) => c.value === this.check())?.help ?? '');
  readonly reviewedLabel = computed(() => REVIEW_CHECKS.find((c) => c.value === this.reviewed())?.label ?? '');
  readonly percent = computed(() => {
    const p = this.progress();
    return p ? Math.round((100 * (p.part - 1)) / p.parts) : 0;
  });

  constructor() {
    void this.api.ensureStatus();
  }

  choose(check: ReviewCheck): void {
    if (!this.running()) {
      this.check.set(check);
    }
  }

  async run(): Promise<void> {
    const bookId = this.bookId();
    if (this.running() || !bookId) {
      return;
    }
    const check = this.check();
    this.running.set(true);
    this.cancelled = false;
    this.error.set(null);
    this.items.set([]);
    this.reviewed.set(check);
    this.finished.set(false);
    this.progress.set({ part: 1, parts: 1 });
    try {
      await this.flush()();
      let fromBlock: string | null = null;
      do {
        const result: ReviewResult = await firstValueFrom(
          this.api.review({ bookId, chapterId: this.chapterId(), check, fromBlock }),
        );
        this.items.update((list) => [...list, ...result.findings.map((f) => ({ ...f, done: false }))]);
        fromBlock = result.nextBlock;
        this.progress.set({ part: result.part + 1, parts: result.parts });
      } while (fromBlock && !this.cancelled);
      this.finished.set(!this.cancelled);
    } catch (error) {
      this.error.set(problemMessage(error, 'Não foi possível revisar agora.'));
    } finally {
      this.running.set(false);
      this.progress.set(null);
    }
  }

  stop(): void {
    this.cancelled = true;
  }

  /** Seleciona o trecho no texto e fecha a gaveta (no celular ela cobre o texto). */
  goTo(item: ReviewView): void {
    const editor = this.editor();
    const range = editor && item.quote ? findQuote(editor.state.doc, item.quote, item.blockId) : null;
    if (!editor || !range) {
      this.toast.add({ severity: 'warn', summary: 'Esse trecho mudou ou já não está no texto.', life: 3000 });
      return;
    }
    this.visible.set(false);
    editor.chain().focus().setTextSelection(range).scrollIntoView().run();
  }

  /** Ortografia: troca só o trecho apontado pela correção (dá para desfazer no editor). */
  fix(item: ReviewView): void {
    const editor = this.editor();
    const range = editor && item.quote ? findQuote(editor.state.doc, item.quote, item.blockId) : null;
    if (!editor || !range) {
      this.toast.add({ severity: 'warn', summary: 'Esse trecho mudou ou já não está no texto.', life: 3000 });
      this.dismiss(item);
      return;
    }
    editor.view.dispatch(editor.state.tr.insertText(item.suggestion, range.from, range.to));
    this.dismiss(item);
  }

  dismiss(item: ReviewView): void {
    this.items.update((list) => list.map((i) => (i === item ? { ...i, done: true } : i)));
  }
}
