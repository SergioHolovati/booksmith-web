import { Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { ManuscriptApi } from '../../core/api/manuscript.api';
import { MentionedIn } from '../../core/models/api.models';

/** Agrupa os capítulos por livro, na ordem em que chegam (livros mais recentes primeiro). */
export function groupByBook(items: MentionedIn[]): { bookId: string; bookTitle: string; chapters: MentionedIn[] }[] {
  const groups = new Map<string, { bookId: string; bookTitle: string; chapters: MentionedIn[] }>();
  for (const item of items) {
    const group = groups.get(item.bookId) ?? { bookId: item.bookId, bookTitle: item.bookTitle, chapters: [] };
    group.chapters.push(item);
    groups.set(item.bookId, group);
  }
  return [...groups.values()];
}

/**
 * "Aparece em": capítulos que mencionam este personagem, lugar ou ficha com "@", agrupados por livro. Tocar
 * abre o capítulo no editor.
 */
@Component({
  selector: 'app-mentioned-in',
  imports: [RouterLink],
  template: `
    <section class="glass-card mentioned" aria-labelledby="mentioned-title">
      <h2 id="mentioned-title" class="title">Aparece em</h2>
      @if (loaded() && groups().length === 0) {
        <p class="muted small">Escreva <strong>&#64;{{ name() }}</strong> no texto de um capítulo para ligar o trecho a esta ficha.</p>
      }
      @for (group of groups(); track group.bookId) {
        <div class="book">
          @if (groups().length > 1) {
            <span class="book-title small">{{ group.bookTitle }}</span>
          }
          <ul>
            @for (chapter of group.chapters; track chapter.chapterId) {
              <li>
                <a [routerLink]="['/write', chapter.chapterId]">
                  <span class="chapter">{{ chapter.chapterTitle || 'Capítulo ' + chapter.position }}</span>
                  <small class="muted">{{ chapter.count }} {{ chapter.count === 1 ? 'menção' : 'menções' }}</small>
                </a>
              </li>
            }
          </ul>
        </div>
      }
    </section>
  `,
  styles: `
    .mentioned { margin-top: 1.5rem; padding: 1rem; display: flex; flex-direction: column; gap: .5rem; }
    .title { margin: 0; font-size: 1.05rem; }
    p { margin: 0; }
    .book-title { color: var(--bs-text-soft); font-weight: 600; }
    ul { list-style: none; margin: .25rem 0 0; padding: 0; display: flex; flex-direction: column; }
    a { display: flex; justify-content: space-between; align-items: center; gap: .75rem;
      min-height: var(--bs-touch); color: var(--bs-text); border-bottom: 1px solid var(--bs-border); }
    li:last-child a { border-bottom: 0; }
    .chapter { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  `,
})
export class MentionedInComponent {
  private readonly api = inject(ManuscriptApi);

  readonly entityId = input.required<string>();
  /** Nome para a dica ("Escreva @Lia..."). */
  readonly name = input('');

  readonly items = signal<MentionedIn[]>([]);
  readonly loaded = signal(false);
  readonly groups = computed(() => groupByBook(this.items()));

  constructor() {
    queueMicrotask(async () => {
      try {
        this.items.set(await firstValueFrom(this.api.mentions(this.entityId())));
      } catch {
        this.items.set([]); // a ficha funciona sem o cartão
      } finally {
        this.loaded.set(true);
      }
    });
  }
}
