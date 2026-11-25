import { Component, computed, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { firstValueFrom } from 'rxjs';

import { ManuscriptApi } from '../../core/api/manuscript.api';
import { problemMessage } from '../../core/api/problem';
import { AiUse, Publication, Rating, ShelfApi, Visibility, WorkStatus } from '../../core/api/shelf.api';
import { BookDetail, ChapterSummary } from '../../core/models/api.models';
import { AI_USE_LABEL, RATINGS, RATING_LABEL, STATUS_LABEL, WARNINGS, WARNING_LABEL } from './shelf-labels';

/** "slow burn, Dragões , #magia" → ["slow burn", "dragões", "magia"] (o servidor confere o limite). */
export function parseTags(text: string): string[] {
  const seen = new Set<string>();
  for (const raw of text.split(',')) {
    const tag = raw.trim().replace(/^#/, '').trim().toLowerCase();
    if (tag) {
      seen.add(tag);
    }
  }
  return [...seen];
}

/** O capítulo mudou depois da última publicação dele? (Republicar leva a versão nova aos leitores.) */
export function changedSince(chapter: ChapterSummary, publication: Publication | null): boolean {
  const published = publication?.chapters.find((c) => c.chapterId === chapter.id);
  return !!published && new Date(chapter.updatedAt).getTime() > new Date(published.updatedAt).getTime();
}

/**
 * Publicar na Estante (`/books/:bookId/estante`): a ficha da obra (classificação, avisos, tags, uso de IA, situação,
 * visibilidade) e quais capítulos vão. Os leitores veem a cópia publicada; editar o rascunho não muda nada até
 * republicar.
 */
@Component({
  selector: 'app-publication',
  imports: [DatePipe, FormsModule, RouterLink, ButtonModule, MessageModule, ProgressSpinnerModule],
  template: `
    <div class="page narrow">
      <a [routerLink]="['/books', bookId()]" class="back-link"><i class="pi pi-arrow-left"></i> Livro</a>
      <div class="page-header">
        <div>
          <h1 class="page-title">Na Estante</h1>
          <p class="page-subtitle">Publique para leitores de graça. Você continua com todos os direitos e pode tirar
            quando quiser.</p>
        </div>
      </div>

      @if (book(); as b) {
        @if (publication(); as p) {
          @if (p.removedAt) {
            <p-message severity="error" styleClass="block-message" data-publication-removed
              [text]="'Tirada da Estante pela moderação: ' + (p.removedReason ?? '') + '. Fale com o suporte se discordar.'" />
          } @else {
            <section class="glass-card status" data-publication-status>
              <span><i class="pi pi-check-circle" aria-hidden="true"></i> Publicada
                ({{ p.chapters.length }} {{ p.chapters.length === 1 ? 'capítulo' : 'capítulos' }}) ·
                {{ p.visibility === 'public' ? 'pública' : 'só com o link' }}</span>
              <a [routerLink]="['/estante/obra', p.slug]" data-publication-link>Ver na Estante</a>
            </section>
          }
        }

        <form class="stack" (ngSubmit)="publish()">
          <fieldset class="glass-card">
            <legend>Classificação indicativa</legend>
            <div class="chips">
              @for (r of ratings; track r) {
                <label class="chip" [class.on]="rating === r">
                  <input type="radio" name="rating" [value]="r" [(ngModel)]="rating" [attr.data-rating]="r" />
                  {{ ratingLabel[r] }}
                </label>
              }
            </div>
            <p class="small muted">Obras 18+ ainda não são aceitas.</p>
          </fieldset>

          <fieldset class="glass-card">
            <legend>Avisos de conteúdo</legend>
            <div class="chips">
              @for (w of warnings; track w) {
                <label class="chip" [class.on]="chosenWarnings().has(w)">
                  <input type="checkbox" [checked]="chosenWarnings().has(w)" (change)="toggleWarning(w)"
                    [attr.data-warning]="w" />
                  {{ warningLabel[w] }}
                </label>
              }
            </div>
            <p class="small muted">O leitor vê os avisos antes de começar.</p>
          </fieldset>

          <fieldset class="glass-card">
            <legend>Uso de IA no texto</legend>
            @for (a of aiUses; track a) {
              <label class="option"><input type="radio" name="aiUse" [value]="a" [(ngModel)]="aiUse" [attr.data-ai-use]="a" />
                {{ aiLabel[a] }}</label>
            }
            <p class="small muted">Aparece na ficha da obra. As ferramentas do Booksmith não escrevem por você.</p>
          </fieldset>

          <fieldset class="glass-card">
            <legend>Situação e visibilidade</legend>
            <div class="chips">
              @for (s of statuses; track s) {
                <label class="chip" [class.on]="status === s">
                  <input type="radio" name="status" [value]="s" [(ngModel)]="status" [attr.data-status]="s" />
                  {{ statusLabel[s] }}
                </label>
              }
            </div>
            <label class="option"><input type="radio" name="visibility" value="public" [(ngModel)]="visibility" />
              Pública: aparece na vitrine</label>
            <label class="option"><input type="radio" name="visibility" value="unlisted" [(ngModel)]="visibility"
              data-visibility-unlisted /> Só com o link: não aparece na vitrine</label>
          </fieldset>

          <fieldset class="glass-card">
            <legend>Tags</legend>
            <label for="tags" class="small muted">Até 10, separadas por vírgula (ex.: slow burn, dragões)</label>
            <input id="tags" name="tags" class="text" [(ngModel)]="tagsText" data-publication-tags />
          </fieldset>

          <fieldset class="glass-card">
            <legend>Capítulos</legend>
            <ul class="chapter-list">
              @for (c of b.chapters; track c.id) {
                <li>
                  <label class="option">
                    <input type="checkbox" [checked]="chosen().has(c.id)" (change)="toggleChapter(c.id)"
                      [attr.data-chapter]="c.position" />
                    <span>{{ c.title || 'Capítulo ' + (c.position + 1) }}
                      @if (isPublished(c.id)) {
                        <small class="muted">· publicado
                          @if (changed(c)) { <strong class="changed">· editado depois</strong> }</small>
                      }
                    </span>
                  </label>
                  @if (isPublished(c.id)) {
                    <button type="button" class="text-button" (click)="unpublishChapter(c)">Tirar</button>
                  }
                </li>
              }
            </ul>
            <p class="small muted">Os marcados são publicados (ou republicados com o texto de agora). Publique de um em um
              para lançar a história em capítulos.</p>
          </fieldset>

          @if (!publication()) {
            <label class="option rights">
              <input type="checkbox" name="rights" [(ngModel)]="rights" data-publication-rights />
              <span class="small">Confirmo que o texto é meu (ou que tenho autorização) e que a classificação e os avisos
                estão certos.</span>
            </label>
          }

          @if (error(); as text) { <p-message severity="error" [text]="text" styleClass="block-message" /> }

          <div class="actions">
            <p-button type="submit" [label]="publication() ? 'Atualizar na Estante' : 'Publicar na Estante'"
              icon="pi pi-send" [loading]="saving()" [disabled]="!canPublish()" data-publication-submit />
            @if (publication() && !publication()?.removedAt) {
              <p-button type="button" label="Tirar da Estante" severity="danger" [text]="true" (onClick)="unpublish()"
                data-publication-remove />
            }
          </div>
        </form>
      } @else if (error(); as text) {
        <p class="muted">{{ text }}</p>
      } @else {
        <div class="center"><p-progress-spinner strokeWidth="4" /></div>
      }
    </div>
  `,
  styles: `
    fieldset { border: 1px solid var(--bs-border); margin: 0; display: flex; flex-direction: column; gap: .5rem; }
    legend { font-weight: 600; padding: 0 .3rem; }
    .chips { display: flex; flex-wrap: wrap; gap: .4rem; }
    .chip { display: inline-flex; align-items: center; gap: .3rem; min-height: 40px; padding: .2rem .8rem;
      border: 1px solid var(--bs-border); border-radius: 999px; font-size: .85rem; cursor: pointer; }
    .chip.on { border-color: var(--bs-accent); }
    .chip input { position: absolute; opacity: 0; pointer-events: none; }
    .option { display: flex; align-items: flex-start; gap: .5rem; min-height: 40px; padding-top: .5rem; }
    .text { width: 100%; min-height: var(--bs-touch); padding: .5rem .7rem; font: inherit; color: var(--bs-text);
      background: var(--bs-surface); border: 1px solid var(--bs-border); border-radius: var(--bs-radius-sm); }
    .chapter-list { list-style: none; margin: 0; padding: 0; }
    .chapter-list li { display: flex; justify-content: space-between; align-items: center; gap: .5rem;
      border-bottom: 1px solid var(--bs-border); }
    .changed { color: var(--bs-ember); font-weight: 600; }
    .text-button { background: none; border: 0; color: var(--bs-muted); font: inherit; font-size: .85rem;
      min-height: var(--bs-touch); cursor: pointer; }
    .status { display: flex; justify-content: space-between; align-items: center; gap: .5rem; flex-wrap: wrap;
      margin-bottom: 1rem; }
    .status i { color: var(--bs-success); }
    .rights { padding: 0; }
    .actions { display: flex; flex-wrap: wrap; gap: .5rem; }
    .center { display: flex; justify-content: center; }
  `,
})
export class PublicationComponent {
  private readonly shelf = inject(ShelfApi);
  private readonly manuscripts = inject(ManuscriptApi);

  readonly bookId = input.required<string>();

  readonly book = signal<BookDetail | null>(null);
  readonly publication = signal<Publication | null>(null);
  readonly error = signal<string | null>(null);
  readonly saving = signal(false);
  readonly chosen = signal<Set<string>>(new Set());
  readonly chosenWarnings = signal<Set<string>>(new Set());

  readonly ratings = RATINGS;
  readonly ratingLabel = RATING_LABEL;
  readonly warnings = WARNINGS;
  readonly warningLabel = WARNING_LABEL;
  readonly aiUses: AiUse[] = ['none', 'assisted', 'generated'];
  readonly aiLabel = AI_USE_LABEL;
  readonly statuses: WorkStatus[] = ['ongoing', 'complete', 'hiatus'];
  readonly statusLabel = STATUS_LABEL;

  rating: Rating | null = null;
  aiUse: AiUse | null = null;
  status: WorkStatus = 'ongoing';
  visibility: Visibility = 'public';
  tagsText = '';
  rights = false;

  readonly canPublish = computed(() => this.chosen().size > 0);

  constructor() {
    queueMicrotask(() => void this.load());
  }

  async load(): Promise<void> {
    try {
      const [book, publication] = await Promise.all([
        firstValueFrom(this.manuscripts.getBook(this.bookId())),
        firstValueFrom(this.shelf.publication(this.bookId())),
      ]);
      this.book.set(book);
      this.show(publication, book);
    } catch (error) {
      this.error.set(problemMessage(error, 'Não foi possível abrir a publicação.'));
    }
  }

  private show(p: Publication | null, book: BookDetail): void {
    this.publication.set(p);
    if (p) {
      this.rating = p.rating;
      this.aiUse = p.aiUse;
      this.status = p.status;
      this.visibility = p.visibility;
      this.tagsText = p.tags.join(', ');
      this.chosenWarnings.set(new Set(p.warnings));
      // Já publicada: marcados só os capítulos novos ou editados depois
      this.chosen.set(new Set(book.chapters.filter((c) => !this.isPublished(c.id) || changedSince(c, p)).map((c) => c.id)));
    } else {
      this.status = book.status === 'COMPLETE' ? 'complete' : 'ongoing';
      this.chosen.set(new Set(book.chapters.filter((c) => c.wordCount > 0).map((c) => c.id)));
    }
  }

  isPublished(chapterId: string): boolean {
    return !!this.publication()?.chapters.some((c) => c.chapterId === chapterId);
  }

  changed(chapter: ChapterSummary): boolean {
    return changedSince(chapter, this.publication());
  }

  toggleChapter(id: string): void {
    const next = new Set(this.chosen());
    if (!next.delete(id)) {
      next.add(id);
    }
    this.chosen.set(next);
  }

  toggleWarning(warning: string): void {
    const next = new Set(this.chosenWarnings());
    if (!next.delete(warning)) {
      next.add(warning);
    }
    this.chosenWarnings.set(next);
  }

  async publish(): Promise<void> {
    if (!this.rating || !this.aiUse) {
      this.error.set('Escolha a classificação indicativa e o uso de IA.');
      return;
    }
    if (!this.publication() && !this.rights) {
      this.error.set('Confirme que o texto é seu e que a classificação está certa.');
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    try {
      const book = this.book() as BookDetail;
      const publication = await firstValueFrom(this.shelf.publish(this.bookId(), {
        rating: this.rating,
        warnings: [...this.chosenWarnings()],
        tags: parseTags(this.tagsText),
        aiUse: this.aiUse,
        status: this.status,
        visibility: this.visibility,
        chapterIds: [...this.chosen()],
      }));
      this.show(publication, book);
    } catch (error) {
      this.error.set(problemMessage(error, 'Não foi possível publicar.'));
    } finally {
      this.saving.set(false);
    }
  }

  async unpublishChapter(chapter: ChapterSummary): Promise<void> {
    await firstValueFrom(this.shelf.unpublishChapter(this.bookId(), chapter.id));
    this.show(await firstValueFrom(this.shelf.publication(this.bookId())), this.book() as BookDetail);
  }

  async unpublish(): Promise<void> {
    if (!confirm('Tirar a obra da Estante? Comentários, curtidas e o lugar dela nas bibliotecas dos leitores somem.')) {
      return;
    }
    await firstValueFrom(this.shelf.unpublish(this.bookId()));
    this.show(null, this.book() as BookDetail);
  }
}
