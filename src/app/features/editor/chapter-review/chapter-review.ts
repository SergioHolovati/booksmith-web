import { HttpErrorResponse } from '@angular/common/http';
import { NgTemplateOutlet } from '@angular/common';
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
import { applyFix } from './apply-fix';
import { findQuote } from './find-quote';

/**
 * As revisões, na ordem em que rodam: a formatação primeiro (regras, sem IA, instantânea), depois ortografia e
 * frases, que se corrigem na hora, e por fim a história.
 */
export const REVIEW_CHECKS: { value: ReviewCheck; label: string; ai: boolean }[] = [
  { value: 'format', label: 'Formatação', ai: false },
  { value: 'spelling', label: 'Ortografia', ai: true },
  { value: 'style', label: 'Frases e estilo', ai: true },
  { value: 'holes', label: 'Furos de roteiro', ai: true },
  { value: 'continuity', label: 'Continuidade', ai: true },
  { value: 'improvements', label: 'Melhorias no enredo', ai: true },
];

/** As revisões com IA: rodam juntas e gastam um uso da cota. */
export const AI_CHECKS = REVIEW_CHECKS.filter((c) => c.ai).map((c) => c.value);

interface ReviewView extends ReviewItem {
  /** Identifica o apontamento na marcação para corrigir em lote. */
  id: number;
  check: ReviewCheck;
  /** Ortografia corrigida ou apontamento dispensado: sai da lista. */
  done: boolean;
}

/**
 * Uma correção que outra revisão já ofereceu para o mesmo trecho (a formatação e a ortografia apontam a mesma fala
 * em minúscula, por exemplo): fica só a primeira.
 */
export function alreadyFixed(list: ReviewItem[], item: ReviewItem): boolean {
  if (!item.fix || !item.quote) {
    return false;
  }
  const quote = core(item.quote);
  return list.some((other) => {
    const known = other.fix && other.blockId === item.blockId && other.quote ? core(other.quote) : '';
    const shorter = Math.min(known.length, quote.length);
    // Um parágrafo inteiro (fala convertida para travessão) não esconde uma frase apontada dentro dele
    const similar = Math.max(known.length, quote.length) <= shorter * 3;
    return shorter >= 3 && similar && (known.includes(quote) || quote.includes(known));
  });
}

/** O trecho sem maiúsculas e sem a pontuação das pontas ('"Próxima,' → 'próxima'). */
function core(text: string): string {
  return text.toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
}

type CheckState = 'waiting' | 'running' | 'done' | 'error' | 'stopped';

/** Erros que valem para todas as revisões (cota, IA desligada, sem conexão): não adianta tentar a próxima. */
function stopsEverything(error: unknown): boolean {
  return error instanceof HttpErrorResponse && [0, 401, 403, 429, 503].includes(error.status);
}

/**
 * "Revisão do capítulo" no editor, em duas ações separadas:
 * <ul>
 *   <li><b>Formatação</b> (regras, sem IA): livre e sem limite, funciona mesmo com a IA desligada;</li>
 *   <li><b>Revisão com IA</b>: ortografia, frases, furos, continuidade e melhorias, de uma vez. Abrir a revisão
 *   gasta um uso da cota (3 a cada 24 horas); as chamadas de dentro dela não gastam mais.</li>
 * </ul>
 * Os apontamentos aparecem agrupados conforme cada revisão termina. O autor decide: tocar no trecho leva ao lugar
 * no texto; "Corrigir" troca só aquele trecho (e dá para desfazer). Capítulos longos vão em partes; o que estiver
 * por salvar é salvo antes, porque a revisão lê o texto do servidor.
 */
@Component({
  selector: 'app-chapter-review',
  imports: [NgTemplateOutlet, ButtonModule, DrawerModule, ProgressBarModule],
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
  /** As revisões da rodada em andamento (só a formatação, ou as cinco com IA), para a barra de andamento. */
  readonly runningChecks = signal<ReviewCheck[]>([]);
  readonly states = signal<Record<ReviewCheck, CheckState>>(this.allStates('waiting'));
  readonly errors = signal<Partial<Record<ReviewCheck, string>>>({});
  /** Revisão atual e parte dela, para a barra de andamento. */
  readonly progress = signal<{ step: number; part: number; parts: number } | null>(null);
  readonly error = signal<string | null>(null);
  readonly items = signal<ReviewView[]>([]);
  /** Apontamentos marcados para "Corrigir marcados". A formatação (regras exatas) já vem marcada. */
  readonly selected = signal<ReadonlySet<number>>(new Set());
  private cancelled = false;
  private nextId = 0;

  readonly status = this.api.status;
  readonly aiEnabled = computed(() => this.status()?.enabled === true);
  readonly remaining = computed(() => this.status()?.remaining ?? 0);
  readonly formatStarted = computed(() => this.states().format !== 'waiting');
  readonly aiStarted = computed(() => AI_CHECKS.some((c) => this.states()[c] !== 'waiting'));
  readonly pendingCount = computed(() => this.items().filter((i) => !i.done).length);
  readonly groups = computed(() =>
    REVIEW_CHECKS.filter((c) => this.states()[c.value] !== 'waiting').map((c) => ({
      ...c,
      state: this.states()[c.value],
      error: this.errors()[c.value] ?? null,
      items: this.items().filter((i) => i.check === c.value && !i.done),
      found: this.items().some((i) => i.check === c.value),
    })).map((g) => {
      const fixable = g.items.filter((i) => i.fix && i.quote);
      const marked = fixable.filter((i) => this.selected().has(i.id));
      return { ...g, fixable, marked };
    }),
  );
  readonly formatGroups = computed(() => this.groups().filter((g) => !g.ai));
  readonly aiGroups = computed(() => this.groups().filter((g) => g.ai));
  readonly currentLabel = computed(() => {
    const check = this.runningChecks()[this.progress()?.step ?? 0];
    return REVIEW_CHECKS.find((c) => c.value === check)?.label ?? '';
  });
  readonly percent = computed(() => {
    const p = this.progress();
    const total = Math.max(1, this.runningChecks().length);
    return p ? Math.round((100 * (p.step + (p.part - 1) / p.parts)) / total) : 0;
  });

  constructor() {
    void this.api.ensureStatus();
  }

  /** Formatação: regras, sem IA e sem gastar a cota. */
  runFormat(): Promise<void> {
    return this.runChecks(['format'], false);
  }

  /** Revisão com IA: abre a revisão (gasta um uso) e roda as cinco revisões com o id dela. */
  runAi(): Promise<void> {
    return this.runChecks(AI_CHECKS, true);
  }

  private async runChecks(checks: ReviewCheck[], ai: boolean): Promise<void> {
    const bookId = this.bookId();
    if (this.running() || !bookId) {
      return;
    }
    this.running.set(true);
    this.runningChecks.set(checks);
    this.cancelled = false;
    this.error.set(null);
    this.errors.update((all) =>
      Object.fromEntries(Object.entries(all).filter(([check]) => !checks.includes(check as ReviewCheck))),
    );
    this.items.update((list) => list.filter((i) => !checks.includes(i.check)));
    this.states.update((all) => ({ ...all, ...Object.fromEntries(checks.map((c) => [c, 'waiting'])) }));
    try {
      await this.flush()();
      const runId = ai ? (await firstValueFrom(this.api.startReview(bookId, this.chapterId()))).runId : null;
      for (const [step, check] of checks.entries()) {
        if (this.cancelled) {
          this.setState(check, 'stopped');
          continue;
        }
        this.setState(check, 'running');
        this.progress.set({ step, part: 1, parts: 1 });
        try {
          await this.review(bookId, check, step, runId);
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
      this.error.set(problemMessage(error, 'Não foi possível começar a revisão agora.'));
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

  /** Troca só o trecho apontado pela sugestão (ortografia, frases, formatação; dá para desfazer no editor). */
  fix(item: ReviewView): void {
    if (!this.applyOne(item)) {
      this.toast.add({ severity: 'warn', summary: 'Esse trecho mudou ou já não está no texto.', life: 3000 });
    }
    this.dismiss(item);
  }

  /** Corrige de uma vez todos os marcados do grupo, na ordem em que aparecem; um Ctrl+Z por correção. */
  fixMarked(items: ReviewView[]): void {
    const marked = items.filter((i) => i.fix && i.quote && this.selected().has(i.id));
    let applied = 0;
    for (const item of marked) {
      applied += this.applyOne(item) ? 1 : 0;
    }
    this.items.update((list) => list.map((i) => (marked.includes(i) ? { ...i, done: true } : i)));
    const missed = marked.length - applied;
    const summary = applied === 1 ? '1 correção aplicada.' : `${applied} correções aplicadas.`;
    this.toast.add({
      severity: missed ? 'warn' : 'success',
      summary: missed ? `${summary} ${missed} trecho(s) já tinham mudado.` : summary,
      life: 4000,
    });
  }

  toggle(item: ReviewView): void {
    this.selected.update((set) => {
      const next = new Set(set);
      if (next.has(item.id)) {
        next.delete(item.id);
      } else {
        next.add(item.id);
      }
      return next;
    });
  }

  /** Marca todos os corrigíveis do grupo; se já estão todos marcados, desmarca. */
  toggleAll(items: ReviewView[]): void {
    const fixable = items.filter((i) => i.fix && i.quote).map((i) => i.id);
    const all = fixable.every((id) => this.selected().has(id));
    this.selected.update((set) => {
      const next = new Set(set);
      fixable.forEach((id) => (all ? next.delete(id) : next.add(id)));
      return next;
    });
  }

  dismiss(item: ReviewView): void {
    this.items.update((list) => list.map((i) => (i === item ? { ...i, done: true } : i)));
  }

  private applyOne(item: ReviewView): boolean {
    const editor = this.editor();
    return !!editor && !!item.quote && applyFix(editor, item.quote, item.suggestion, item.blockId);
  }

  /** Uma revisão, parte por parte, até o fim do capítulo (ou até o autor parar). */
  private async review(bookId: string, check: ReviewCheck, step: number, runId: string | null): Promise<void> {
    let fromBlock: string | null = null;
    do {
      const result: ReviewResult = await firstValueFrom(
        this.api.review({ bookId, chapterId: this.chapterId(), check, fromBlock, runId }),
      );
      const added = result.findings
        .filter((f) => !alreadyFixed(this.items(), f))
        .map((f) => ({ ...f, id: this.nextId++, check, done: false }));
      this.items.update((list) => [...list, ...added]);
      if (check === 'format') {
        this.selected.update((set) => new Set([...set, ...added.filter((i) => i.fix).map((i) => i.id)]));
      }
      fromBlock = result.nextBlock;
      this.progress.set({ step, part: result.part + 1, parts: result.parts });
    } while (fromBlock && !this.cancelled);
  }

  private setState(check: ReviewCheck, state: CheckState): void {
    this.states.update((all) => ({ ...all, [check]: state }));
  }

  private allStates(state: CheckState): Record<ReviewCheck, CheckState> {
    return { format: state, spelling: state, style: state, holes: state, continuity: state, improvements: state };
  }
}
