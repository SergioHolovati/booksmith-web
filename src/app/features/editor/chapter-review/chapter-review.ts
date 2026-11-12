import { HttpErrorResponse } from '@angular/common/http';
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

/** As revisões, na ordem em que rodam: a ortografia primeiro, porque é a mais rápida e a que se corrige na hora. */
export const REVIEW_CHECKS: { value: ReviewCheck; label: string }[] = [
  { value: 'spelling', label: 'Ortografia' },
  { value: 'holes', label: 'Furos de roteiro' },
  { value: 'continuity', label: 'Continuidade' },
  { value: 'improvements', label: 'Melhorias no enredo' },
];

interface ReviewView extends ReviewItem {
  check: ReviewCheck;
  /** Ortografia corrigida ou apontamento dispensado: sai da lista. */
  done: boolean;
}

type CheckState = 'waiting' | 'running' | 'done' | 'error' | 'stopped';

/** Erros que valem para todas as revisões (cota, IA desligada, sem conexão): não adianta tentar a próxima. */
function stopsEverything(error: unknown): boolean {
  return error instanceof HttpErrorResponse && [0, 401, 403, 429, 503].includes(error.status);
}

/**
 * "Revisão da IA" no editor: um botão revisa tudo de uma vez — ortografia, furos de roteiro, continuidade e
 * melhorias no enredo, nessa ordem — e os apontamentos aparecem agrupados conforme cada revisão termina. A IA
 * aponta e o autor decide: tocar no trecho seleciona o lugar no texto; na ortografia, "Corrigir" troca só aquele
 * trecho (e dá para desfazer). Capítulos longos vão em partes; o que estiver por salvar é salvo antes, porque a
 * revisão lê o texto do servidor.
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
  readonly running = signal(false);
  readonly started = signal(false);
  readonly states = signal<Record<ReviewCheck, CheckState>>(this.allStates('waiting'));
  readonly errors = signal<Partial<Record<ReviewCheck, string>>>({});
  /** Revisão atual e parte dela, para a barra de andamento. */
  readonly progress = signal<{ step: number; part: number; parts: number } | null>(null);
  readonly error = signal<string | null>(null);
  readonly items = signal<ReviewView[]>([]);
  private cancelled = false;

  readonly status = this.api.status;
  readonly pendingCount = computed(() => this.items().filter((i) => !i.done).length);
  readonly groups = computed(() =>
    REVIEW_CHECKS.filter((c) => this.states()[c.value] !== 'waiting').map((c) => ({
      ...c,
      state: this.states()[c.value],
      error: this.errors()[c.value] ?? null,
      items: this.items().filter((i) => i.check === c.value && !i.done),
      found: this.items().some((i) => i.check === c.value),
    })),
  );
  readonly currentLabel = computed(() => REVIEW_CHECKS[this.progress()?.step ?? 0]?.label ?? '');
  readonly percent = computed(() => {
    const p = this.progress();
    return p ? Math.round((100 * (p.step + (p.part - 1) / p.parts)) / REVIEW_CHECKS.length) : 0;
  });

  constructor() {
    void this.api.ensureStatus();
  }

  async run(): Promise<void> {
    const bookId = this.bookId();
    if (this.running() || !bookId) {
      return;
    }
    this.running.set(true);
    this.started.set(true);
    this.cancelled = false;
    this.error.set(null);
    this.errors.set({});
    this.items.set([]);
    this.states.set(this.allStates('waiting'));
    try {
      await this.flush()();
      for (const [step, { value: check }] of REVIEW_CHECKS.entries()) {
        if (this.cancelled) {
          this.setState(check, 'stopped');
          continue;
        }
        this.setState(check, 'running');
        this.progress.set({ step, part: 1, parts: 1 });
        try {
          await this.review(bookId, check, step);
          this.setState(check, this.cancelled ? 'stopped' : 'done');
        } catch (error) {
          this.setState(check, 'error');
          this.errors.update((all) => ({ ...all, [check]: problemMessage(error, 'Não foi possível revisar agora.') }));
          if (stopsEverything(error)) {
            this.cancelled = true;
          }
        }
      }
    } catch (error) {
      this.error.set(problemMessage(error, 'Não foi possível salvar o capítulo antes de revisar.'));
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

  /** Uma revisão, parte por parte, até o fim do capítulo (ou até o autor parar). */
  private async review(bookId: string, check: ReviewCheck, step: number): Promise<void> {
    let fromBlock: string | null = null;
    do {
      const result: ReviewResult = await firstValueFrom(
        this.api.review({ bookId, chapterId: this.chapterId(), check, fromBlock }),
      );
      this.items.update((list) => [...list, ...result.findings.map((f) => ({ ...f, check, done: false }))]);
      fromBlock = result.nextBlock;
      this.progress.set({ step, part: result.part + 1, parts: result.parts });
    } while (fromBlock && !this.cancelled);
  }

  private setState(check: ReviewCheck, state: CheckState): void {
    this.states.update((all) => ({ ...all, [check]: state }));
  }

  private allStates(state: CheckState): Record<ReviewCheck, CheckState> {
    return { spelling: state, holes: state, continuity: state, improvements: state };
  }
}
