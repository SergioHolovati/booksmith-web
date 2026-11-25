import { Component, computed, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { firstValueFrom } from 'rxjs';

import { problemMessage } from '../../core/api/problem';
import { ShelfApi, WorkDetail } from '../../core/api/shelf.api';
import { AuthService } from '../../core/auth/auth.service';
import { ReportFormComponent } from './report-form';
import { ShelfHeaderComponent } from './shelf-header';
import { AI_USE_LABEL, RATING_LABEL, STATUS_LABEL, WARNING_LABEL, readingMinutes, wordsLabel } from './shelf-labels';

/**
 * Ficha da obra (`/estante/obra/:slug`): capa, autor, classificação, avisos de conteúdo (antes de começar), uso de
 * IA, sinopse, tags e capítulos. Com login: continuar de onde parou, biblioteca, seguir o autor e denunciar.
 */
@Component({
  selector: 'app-work-page',
  imports: [DatePipe, RouterLink, ButtonModule, ProgressSpinnerModule, ShelfHeaderComponent, ReportFormComponent],
  template: `
    <app-shelf-header />
    <main class="shelf">
      @if (detail(); as d) {
        <article class="work" data-work-page [attr.data-slug]="d.work.slug">
          <div class="head">
            @if (d.work.coverUrl) {
              <img class="big-cover" [src]="d.work.coverUrl" alt="Capa de {{ d.work.title }}" />
            }
            <div class="head-text">
              <h1>{{ d.work.title }}</h1>
              <a class="author" [routerLink]="['/estante/autor', d.work.authorId]" data-work-author>por
                {{ d.work.authorName }}</a>
              <div class="meta">
                <span class="badge rating" data-work-rating>{{ ratingLabel[d.work.rating] }}</span>
                <span class="badge">{{ statusLabel[d.work.status] }}</span>
                @if (d.work.fanfic) { <span class="badge">Fanfic{{ d.work.fandom ? ' · ' + d.work.fandom : '' }}</span> }
                <span class="badge" data-work-ai><i class="pi pi-info-circle" aria-hidden="true"></i>
                  {{ aiLabel[d.work.aiUse] }}</span>
              </div>
              <p class="small muted">{{ d.work.chapters }} {{ d.work.chapters === 1 ? 'capítulo' : 'capítulos' }} ·
                {{ words(d.work.words) }} · cerca de {{ minutes(d.work.words) }} min ·
                {{ d.work.likes }} {{ d.work.likes === 1 ? 'curtida' : 'curtidas' }}</p>
            </div>
          </div>

          @if (d.work.warnings.length > 0) {
            <section class="warnings glass-card" data-work-warnings aria-labelledby="warnings-title">
              <h2 id="warnings-title"><i class="pi pi-exclamation-triangle" aria-hidden="true"></i> Avisos de conteúdo</h2>
              <p class="small">{{ warningList() }}</p>
            </section>
          }

          <div class="actions">
            <p-button [label]="continueLabel()" icon="pi pi-book" [routerLink]="['/estante/obra', d.work.slug, continueAt()]"
              data-work-read />
            @if (d.reader; as r) {
              @if (!r.mine) {
                <p-button [label]="r.inLibrary ? 'Na biblioteca' : 'Guardar na biblioteca'"
                  [icon]="r.inLibrary ? 'pi pi-bookmark-fill' : 'pi pi-bookmark'" severity="secondary"
                  [outlined]="!r.inLibrary" (onClick)="toggleLibrary()" data-work-library />
                <p-button [label]="r.followingAuthor ? 'Seguindo o autor' : 'Seguir o autor'"
                  [icon]="r.followingAuthor ? 'pi pi-check' : 'pi pi-user-plus'" severity="secondary"
                  [outlined]="!r.followingAuthor" (onClick)="toggleFollow()" data-work-follow />
              }
            } @else {
              <p class="small muted">Entre para guardar na biblioteca, seguir o autor, curtir e comentar.
                <a [routerLink]="['/login']">Entrar</a></p>
            }
          </div>

          @if (d.work.synopsis) {
            <p class="synopsis-full" data-work-synopsis>{{ d.work.synopsis }}</p>
          }
          @if (d.work.tags.length > 0) {
            <div class="meta tags">
              @for (t of d.work.tags; track t) { <span class="badge">#{{ t }}</span> }
            </div>
          }

          <section aria-labelledby="chapters-title">
            <h2 id="chapters-title" class="section-title">Capítulos</h2>
            <ol class="chapters" data-work-chapters>
              @for (c of d.chapters; track c.number) {
                <li>
                  <a [routerLink]="['/estante/obra', d.work.slug, c.number]" class="chapter-link"
                    [class.read]="(d.reader?.lastChapter ?? 0) >= c.number">
                    <span>{{ c.number }}. {{ c.title }}</span>
                    <small class="muted">{{ words(c.words) }} · {{ c.updatedAt | date: 'dd/MM/yyyy' }}</small>
                  </a>
                </li>
              }
            </ol>
          </section>

          @if (d.reader && !d.reader.mine) {
            @if (reporting()) {
              <app-report-form targetType="work" [targetId]="d.work.id" (closed)="reporting.set(false)" />
            } @else {
              <button type="button" class="link-button small" (click)="reporting.set(true)" data-work-report>
                <i class="pi pi-flag" aria-hidden="true"></i> Denunciar esta obra
              </button>
            }
          }
        </article>
      } @else if (error(); as text) {
        <p class="muted empty" data-work-error>{{ text }} <a routerLink="/estante">Voltar à Estante</a></p>
      } @else {
        <div class="center"><p-progress-spinner strokeWidth="4" /></div>
      }
    </main>
  `,
  styleUrl: './shelf.scss',
  styles: `
    .work { display: flex; flex-direction: column; gap: 1rem; padding-top: 1rem; }
    .head { display: flex; gap: 1rem; align-items: flex-start; }
    .big-cover { width: 110px; aspect-ratio: 2 / 3; object-fit: cover; border-radius: 8px; flex: none; }
    .head-text { display: flex; flex-direction: column; gap: .35rem; min-width: 0; }
    h1 { font-size: 1.5rem; margin: 0; line-height: 1.2; }
    .author { color: var(--bs-ember); min-height: 32px; display: inline-flex; align-items: center; }
    .warnings h2 { font-size: .95rem; margin: 0 0 .3rem; display: flex; gap: .4rem; align-items: center; }
    .warnings h2 i { color: var(--bs-ember); }
    .warnings p { margin: 0; }
    .actions { display: flex; flex-wrap: wrap; gap: .5rem; align-items: center; }
    .synopsis-full { white-space: pre-line; line-height: 1.6; margin: 0; color: var(--bs-text-soft); }
    .section-title { font-size: 1rem; color: var(--bs-text-soft); margin: .5rem 0; }
    .chapters { list-style: none; margin: 0; padding: 0; }
    .chapter-link { display: flex; flex-direction: column; gap: .1rem; padding: .6rem 0; min-height: var(--bs-touch);
      border-bottom: 1px solid var(--bs-border); color: var(--bs-text); }
    .chapter-link.read span { color: var(--bs-muted); }
    .link-button { align-self: flex-start; background: none; border: 0; color: var(--bs-muted); cursor: pointer;
      min-height: var(--bs-touch); font: inherit; display: inline-flex; gap: .3rem; align-items: center; }
  `,
})
export class WorkPageComponent {
  private readonly api = inject(ShelfApi);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly slug = input.required<string>();

  readonly detail = signal<WorkDetail | null>(null);
  readonly error = signal<string | null>(null);
  readonly reporting = signal(false);
  readonly ratingLabel = RATING_LABEL;
  readonly statusLabel = STATUS_LABEL;
  readonly aiLabel = AI_USE_LABEL;
  readonly words = wordsLabel;
  readonly minutes = readingMinutes;

  readonly warningList = computed(() =>
    (this.detail()?.work.warnings ?? []).map((w) => WARNING_LABEL[w] ?? w).join(' · '));
  readonly continueAt = computed(() => Math.max(1, this.detail()?.reader?.lastChapter ?? 1));
  readonly continueLabel = computed(() => {
    const last = this.detail()?.reader?.lastChapter ?? 0;
    return last > 0 ? `Continuar no capítulo ${last}` : 'Começar a ler';
  });

  constructor() {
    queueMicrotask(() => void this.load());
  }

  async load(): Promise<void> {
    try {
      this.detail.set(await firstValueFrom(this.api.work(this.slug())));
    } catch (error) {
      this.error.set(problemMessage(error, 'Não foi possível abrir a obra.'));
    }
  }

  async toggleLibrary(): Promise<void> {
    const d = this.detail();
    if (!d?.reader) {
      return;
    }
    const add = !d.reader.inLibrary;
    await firstValueFrom(this.api.library(d.work.slug, add));
    this.detail.set({ ...d, reader: { ...d.reader, inLibrary: add } });
  }

  async toggleFollow(): Promise<void> {
    const d = this.detail();
    if (!d?.reader) {
      return;
    }
    if (!this.auth.isAuthenticated()) {
      await this.router.navigate(['/login']);
      return;
    }
    const follow = !d.reader.followingAuthor;
    await firstValueFrom(this.api.follow(d.work.authorId, follow));
    this.detail.set({ ...d, reader: { ...d.reader, followingAuthor: follow } });
  }
}
