import { Component, HostListener, OnDestroy, computed, effect, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { firstValueFrom } from 'rxjs';

import { problemMessage } from '../../core/api/problem';
import { ChapterView, ShelfApi, ShelfComment } from '../../core/api/shelf.api';
import { AuthService } from '../../core/auth/auth.service';
import { ReportFormComponent } from './report-form';
import { RATING_LABEL, readingMinutes } from './shelf-labels';

export type ReaderTheme = 'dark' | 'light' | 'sepia';
export type ReaderFont = 'serif' | 'sans';

export interface ReaderPrefs {
  theme: ReaderTheme;
  size: number;
  font: ReaderFont;
}

export const DEFAULT_PREFS: ReaderPrefs = { theme: 'dark', size: 1.1, font: 'serif' };
export const SIZES = [0.95, 1.1, 1.25, 1.45];
const PREFS_KEY = 'booksmith.reader';

/** Ajustes de leitura deste aparelho; sem nada guardado (ou guardado errado), o padrão. */
export function readPrefs(raw: string | null): ReaderPrefs {
  try {
    const p = raw ? (JSON.parse(raw) as Partial<ReaderPrefs>) : {};
    return {
      theme: p.theme === 'light' || p.theme === 'sepia' ? p.theme : 'dark',
      size: SIZES.includes(p.size ?? 0) ? (p.size as number) : DEFAULT_PREFS.size,
      font: p.font === 'sans' ? 'sans' : 'serif',
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

/** Quanto do capítulo já passou pela tela, de 0 a 1. */
export function scrollProgress(scrollTop: number, scrollHeight: number, viewport: number): number {
  const room = scrollHeight - viewport;
  return room <= 0 ? 1 : Math.min(1, Math.max(0, scrollTop / room));
}

/**
 * Leitor da Estante (`/estante/obra/:slug/:number`): o capítulo com tema (escuro, claro, sépia), tamanho e fonte
 * ajustáveis, anterior e próximo, curtir e comentários. Com login, guarda onde a pessoa parou.
 */
@Component({
  selector: 'app-reader-page',
  imports: [DatePipe, FormsModule, RouterLink, ButtonModule, ProgressSpinnerModule, ReportFormComponent],
  template: `
    <div class="reader" [attr.data-theme]="prefs().theme" [class.sans]="prefs().font === 'sans'"
      [style.--reader-size.rem]="prefs().size">
      <header class="bar">
        <a [routerLink]="['/estante/obra', slug()]" class="back" data-reader-back>
          <i class="pi pi-arrow-left" aria-hidden="true"></i>
          <span class="bar-title">{{ chapter()?.workTitle ?? 'Estante' }}</span>
        </a>
        <button type="button" class="icon-button" (click)="showSettings.set(!showSettings())"
          [attr.aria-expanded]="showSettings()" aria-label="Ajustes de leitura" data-reader-settings>
          <span aria-hidden="true">Aa</span>
        </button>
      </header>

      @if (showSettings()) {
        <div class="settings" role="group" aria-label="Ajustes de leitura" data-reader-settings-panel>
          <div class="row-set">
            @for (t of themes; track t.value) {
              <button type="button" class="pick" [class.on]="prefs().theme === t.value" (click)="set({ theme: t.value })"
                [attr.data-reader-theme]="t.value">{{ t.label }}</button>
            }
          </div>
          <div class="row-set">
            <button type="button" class="pick" (click)="resize(-1)" aria-label="Letra menor" [disabled]="prefs().size === sizes[0]">A−</button>
            <button type="button" class="pick" (click)="resize(1)" aria-label="Letra maior" data-reader-bigger
              [disabled]="prefs().size === sizes[sizes.length - 1]">A+</button>
            <button type="button" class="pick" [class.on]="prefs().font === 'serif'" (click)="set({ font: 'serif' })">Serifa</button>
            <button type="button" class="pick" [class.on]="prefs().font === 'sans'" (click)="set({ font: 'sans' })">Sem serifa</button>
          </div>
        </div>
      }

      <main class="page-text">
        @if (chapter(); as c) {
          <article data-reader-chapter [attr.data-number]="c.number">
            <p class="kicker">Capítulo {{ c.number }} de {{ c.total }} · {{ minutes(c.words) }} min ·
              {{ ratingLabel[c.rating] }}</p>
            <h1>{{ c.title }}</h1>
            <a class="author" [routerLink]="['/estante/autor', c.authorId]">{{ c.authorName }}</a>
            <div class="prose" [innerHTML]="c.html" data-reader-text></div>
          </article>

          <div class="after">
            <button type="button" class="like" [class.on]="c.liked" (click)="toggleLike()" [attr.aria-pressed]="c.liked"
              data-reader-like>
              <i [class]="c.liked ? 'pi pi-heart-fill' : 'pi pi-heart'" aria-hidden="true"></i>
              {{ c.likes }} {{ c.likes === 1 ? 'curtida' : 'curtidas' }}
            </button>
            <nav class="pager" aria-label="Capítulos">
              @if (c.number > 1) {
                <a [routerLink]="['/estante/obra', slug(), c.number - 1]" class="pager-link" data-reader-prev>
                  <i class="pi pi-chevron-left" aria-hidden="true"></i> Anterior</a>
              }
              @if (c.number < c.total) {
                <a [routerLink]="['/estante/obra', slug(), c.number + 1]" class="pager-link next" data-reader-next>
                  Próximo <i class="pi pi-chevron-right" aria-hidden="true"></i></a>
              } @else {
                <span class="small muted end" data-reader-end>Fim do que já foi publicado.</span>
              }
            </nav>
          </div>

          <section class="comments" aria-labelledby="comments-title" data-reader-comments>
            <h2 id="comments-title">Comentários ({{ comments().length }})</h2>
            @if (auth.isAuthenticated()) {
              <form class="comment-form" (ngSubmit)="sendComment()">
                <label for="comment" class="sr-only">Seu comentário</label>
                <textarea id="comment" name="comment" rows="3" maxlength="2000" [(ngModel)]="draft"
                  placeholder="O que você achou deste capítulo?" data-reader-comment-input></textarea>
                @if (commentError(); as text) { <p class="small error">{{ text }}</p> }
                <p-button type="submit" label="Comentar" size="small" [disabled]="!draft.trim()" [loading]="sending()"
                  data-reader-comment-send />
              </form>
            } @else {
              <p class="small">Para comentar, <a routerLink="/login">entre</a> ou <a routerLink="/register">crie uma conta</a>.</p>
            }
            <ul class="comment-list">
              @for (m of comments(); track m.id) {
                <li class="comment" [attr.data-comment]="m.id">
                  <div class="comment-head">
                    @if (m.authorName) {
                      <a [routerLink]="['/estante/autor', m.authorId]" class="comment-author">{{ m.authorName }}</a>
                    } @else {
                      <span class="comment-author">Leitor</span>
                    }
                    <small>{{ m.createdAt | date: 'dd/MM/yyyy HH:mm' }}</small>
                  </div>
                  <p class="comment-body">{{ m.body }}</p>
                  <div class="comment-actions">
                    @if (m.mine || mine()) {
                      <button type="button" class="text-button" (click)="deleteComment(m)" data-comment-delete>Apagar</button>
                    }
                    @if (!m.mine && auth.isAuthenticated()) {
                      <button type="button" class="text-button" (click)="reportingComment.set(m.id)" data-comment-report>Denunciar</button>
                    }
                  </div>
                  @if (reportingComment() === m.id) {
                    <app-report-form targetType="comment" [targetId]="m.id" (closed)="reportingComment.set(null)" />
                  }
                </li>
              }
            </ul>
          </section>
        } @else if (error(); as text) {
          <p class="muted" data-reader-error>{{ text }} <a routerLink="/estante">Voltar à Estante</a></p>
        } @else {
          <div class="center"><p-progress-spinner strokeWidth="4" /></div>
        }
      </main>
    </div>
  `,
  styles: `
    :host { display: block; }
    .reader { --r-bg: #0f0f0f; --r-text: #e8e3da; --r-muted: #9a958c; --r-line: rgba(255,255,255,.08);
      min-height: 100dvh; background: var(--r-bg); color: var(--r-text); }
    .reader[data-theme='light'] { --r-bg: #fbfaf7; --r-text: #1d1b18; --r-muted: #6b665d; --r-line: rgba(0,0,0,.1); }
    .reader[data-theme='sepia'] { --r-bg: #f4ecd8; --r-text: #3b2f22; --r-muted: #7a6a55; --r-line: rgba(59,47,34,.15); }
    .bar { position: sticky; top: 0; z-index: 5; display: flex; align-items: center; justify-content: space-between;
      gap: .5rem; padding: calc(.25rem + var(--bs-safe-top)) var(--bs-gutter) .25rem; background: var(--r-bg);
      border-bottom: 1px solid var(--r-line); }
    .back { display: inline-flex; align-items: center; gap: .5rem; min-height: var(--bs-touch); color: var(--r-text);
      min-width: 0; }
    .bar-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: .9rem; }
    .icon-button { min-width: var(--bs-touch); min-height: var(--bs-touch); background: none; border: 0;
      color: var(--r-text); font: inherit; font-weight: 600; cursor: pointer; }
    .settings { display: flex; flex-direction: column; gap: .5rem; padding: .6rem var(--bs-gutter);
      border-bottom: 1px solid var(--r-line); }
    .row-set { display: flex; flex-wrap: wrap; gap: .4rem; }
    .pick { min-height: 40px; padding: .2rem .8rem; border-radius: 999px; border: 1px solid var(--r-line);
      background: transparent; color: var(--r-text); font: inherit; font-size: .85rem; cursor: pointer; }
    .pick.on { border-color: var(--bs-ember); }
    .page-text { max-width: 40rem; margin: 0 auto; padding: 1rem var(--bs-gutter) calc(3rem + var(--bs-safe-bottom));
      overflow-wrap: anywhere; }
    .kicker { color: var(--r-muted); font-size: .8rem; margin: 0; }
    h1, h2 { color: var(--r-text); }
    h1 { font-family: var(--bs-font-prose); font-size: 1.6rem; margin: .3rem 0 .2rem; line-height: 1.25; }
    .author { color: var(--bs-ember); font-size: .9rem; }
    .prose { font-family: var(--bs-font-prose); font-size: var(--reader-size, 1.1rem); line-height: 1.75;
      margin-top: 1.2rem; }
    .reader.sans .prose { font-family: var(--bs-font-ui); }
    .prose ::ng-deep p { margin: 0 0 .9em; }
    .prose ::ng-deep p.scene-break { text-align: center; letter-spacing: .3em; margin: 1.5em 0; }
    .prose ::ng-deep h2, .prose ::ng-deep h3 { font-size: 1.15em; margin: 1.4em 0 .6em; }
    .prose ::ng-deep blockquote { margin: 1em 0; padding-left: 1em; border-left: 3px solid var(--r-line); }
    .prose ::ng-deep .callout { border: 1px solid var(--r-line); border-radius: 10px; padding: .6em .9em; margin: 1em 0; }
    .prose ::ng-deep figure { margin: 1em 0; color: var(--r-muted); font-size: .85em; text-align: center; }
    .after { display: flex; flex-direction: column; gap: .8rem; margin: 2rem 0 1rem; padding-top: 1rem;
      border-top: 1px solid var(--r-line); }
    .like { align-self: flex-start; display: inline-flex; gap: .4rem; align-items: center; min-height: var(--bs-touch);
      padding: 0 1rem; border-radius: 999px; border: 1px solid var(--r-line); background: transparent;
      color: var(--r-text); font: inherit; cursor: pointer; }
    .like.on i { color: #e0565b; }
    .pager { display: flex; justify-content: space-between; gap: .5rem; }
    .pager-link { display: inline-flex; align-items: center; gap: .3rem; min-height: var(--bs-touch);
      color: var(--bs-ember); }
    .pager-link.next, .end { margin-left: auto; }
    .comments h2 { font-size: 1rem; margin: 1rem 0 .6rem; }
    .comment-form { display: flex; flex-direction: column; gap: .5rem; align-items: flex-end; margin-bottom: 1rem; }
    textarea { width: 100%; font: inherit; color: var(--r-text); background: transparent;
      border: 1px solid var(--r-line); border-radius: 10px; padding: .6rem; }
    .comment-list { list-style: none; margin: 0; padding: 0; }
    .comment { padding: .7rem 0; border-bottom: 1px solid var(--r-line); }
    .comment-head { display: flex; justify-content: space-between; gap: .5rem; color: var(--r-muted); }
    .comment-author { color: var(--r-text); font-weight: 600; font-size: .9rem; }
    .comment-body { margin: .3rem 0; white-space: pre-line; line-height: 1.5; }
    .comment-actions { display: flex; gap: .8rem; }
    .text-button { background: none; border: 0; color: var(--r-muted); font: inherit; font-size: .8rem;
      min-height: 32px; cursor: pointer; padding: 0; }
    .error { color: var(--bs-danger); }
    .center { display: flex; justify-content: center; padding: 2rem 0; }
    .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
  `,
})
export class ReaderPageComponent implements OnDestroy {
  private readonly api = inject(ShelfApi);
  readonly auth = inject(AuthService);

  readonly slug = input.required<string>();
  readonly number = input.required<string>();

  readonly chapter = signal<ChapterView | null>(null);
  readonly comments = signal<ShelfComment[]>([]);
  readonly error = signal<string | null>(null);
  readonly prefs = signal<ReaderPrefs>(DEFAULT_PREFS);
  readonly showSettings = signal(false);
  readonly sending = signal(false);
  readonly commentError = signal<string | null>(null);
  readonly reportingComment = signal<string | null>(null);
  readonly mine = signal(false);
  readonly ratingLabel = RATING_LABEL;
  readonly minutes = readingMinutes;
  readonly sizes = SIZES;
  readonly themes: { value: ReaderTheme; label: string }[] = [
    { value: 'dark', label: 'Escuro' },
    { value: 'light', label: 'Claro' },
    { value: 'sepia', label: 'Sépia' },
  ];
  readonly chapterNumber = computed(() => Number(this.number()));
  draft = '';
  private progressTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    try {
      this.prefs.set(readPrefs(localStorage.getItem(PREFS_KEY)));
    } catch {
      // Sem acesso ao armazenamento: o padrão
    }
    // Trocar de capítulo (anterior/próximo) reaproveita o componente: recarrega
    effect(() => {
      const slug = this.slug();
      const number = this.chapterNumber();
      queueMicrotask(() => void this.load(slug, number));
    });
  }

  set(change: Partial<ReaderPrefs>): void {
    const next = { ...this.prefs(), ...change };
    this.prefs.set(next);
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(next));
    } catch {
      // Só não fica lembrado
    }
  }

  resize(step: number): void {
    const index = SIZES.indexOf(this.prefs().size) + step;
    this.set({ size: SIZES[Math.min(SIZES.length - 1, Math.max(0, index))] });
  }

  async load(slug: string, number: number): Promise<void> {
    this.error.set(null);
    this.chapter.set(null);
    this.comments.set([]);
    try {
      const chapter = await firstValueFrom(this.api.chapter(slug, number));
      this.chapter.set(chapter);
      window.scrollTo({ top: 0 });
      this.comments.set(await firstValueFrom(this.api.comments(slug, number)));
      if (this.auth.isAuthenticated()) {
        this.mine.set(this.auth.user()?.id === chapter.authorId);
        this.saveProgress(0);
      }
    } catch (error) {
      this.error.set(problemMessage(error, 'Não foi possível abrir o capítulo.'));
    }
  }

  @HostListener('window:scroll')
  onScroll(): void {
    if (!this.auth.isAuthenticated() || !this.chapter()) {
      return;
    }
    const root = document.documentElement;
    const progress = scrollProgress(root.scrollTop, root.scrollHeight, window.innerHeight);
    if (this.progressTimer) {
      clearTimeout(this.progressTimer);
    }
    this.progressTimer = setTimeout(() => this.saveProgress(progress), 1500);
  }

  private saveProgress(progress: number): void {
    const c = this.chapter();
    if (c) {
      void firstValueFrom(this.api.progress(c.workSlug, c.number, progress)).catch(() => undefined);
    }
  }

  async toggleLike(): Promise<void> {
    const c = this.chapter();
    if (!c) {
      return;
    }
    if (!this.auth.isAuthenticated()) {
      this.commentError.set('Entre na sua conta para curtir.');
      return;
    }
    const liked = !c.liked;
    this.chapter.set({ ...c, liked, likes: c.likes + (liked ? 1 : -1) });
    try {
      await firstValueFrom(this.api.like(c.workSlug, c.number, liked));
    } catch {
      this.chapter.set(c);
    }
  }

  async sendComment(): Promise<void> {
    const c = this.chapter();
    const body = this.draft.trim();
    if (!c || !body) {
      return;
    }
    this.sending.set(true);
    this.commentError.set(null);
    try {
      const comment = await firstValueFrom(this.api.comment(c.workSlug, c.number, body));
      this.comments.set([...this.comments(), comment]);
      this.draft = '';
    } catch (error) {
      this.commentError.set(problemMessage(error, 'Não foi possível comentar.'));
    } finally {
      this.sending.set(false);
    }
  }

  async deleteComment(comment: ShelfComment): Promise<void> {
    await firstValueFrom(this.api.deleteComment(comment.id));
    this.comments.set(this.comments().filter((m) => m.id !== comment.id));
  }

  ngOnDestroy(): void {
    if (this.progressTimer) {
      clearTimeout(this.progressTimer);
    }
  }
}
