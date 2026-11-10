import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';

import { HELP_ARTICLES, HelpBlock, richParts } from './help-articles';

/** Um artigo da central de ajuda (`/ajuda/:slug`). */
@Component({
  selector: 'app-help-article',
  imports: [RouterLink, ButtonModule],
  template: `
    <div class="page narrow">
      <a routerLink="/ajuda" class="back-link"><i class="pi pi-arrow-left"></i> Ajuda</a>
      @if (article(); as article) {
        <article class="article">
          <h1 class="page-title">{{ article.title }}</h1>
          @for (block of article.body; track $index) {
            @if (isParagraph(block)) {
              <p>
                @for (part of parts(block.p); track $index) {<span [class.bold]="part.bold">{{ part.text }}</span>}
              </p>
            } @else if (isHeading(block)) {
              <h2>{{ block.h }}</h2>
            } @else {
              @let list = listOf(block);
              @if (list.ordered) {
                <ol>
                  @for (item of list.items; track $index) {
                    <li>
                      @for (part of parts(item); track $index) {<span [class.bold]="part.bold">{{ part.text }}</span>}
                    </li>
                  }
                </ol>
              } @else {
                <ul>
                  @for (item of list.items; track $index) {
                    <li>
                      @for (part of parts(item); track $index) {<span [class.bold]="part.bold">{{ part.text }}</span>}
                    </li>
                  }
                </ul>
              }
            }
          }
        </article>
        <div class="glass-card helped">
          <span class="muted small">Não resolveu?</span>
          <p-button label="Falar com o suporte" icon="pi pi-comments" size="small" routerLink="/ajuda/contato" />
        </div>
      } @else {
        <div class="glass-card empty-state">
          <i class="pi pi-question-circle"></i>
          <p>Este artigo não existe mais.</p>
          <p-button label="Ver a ajuda" severity="secondary" [outlined]="true" routerLink="/ajuda" />
        </div>
      }
    </div>
  `,
  styles: `
    .article { line-height: 1.65; }
    .article h2 { font-size: 1.05rem; margin: 1.5rem 0 .5rem; }
    .article ol, .article ul { padding-left: 1.25rem; display: flex; flex-direction: column; gap: .5rem; }
    .article .bold { color: var(--bs-accent-light); font-weight: 600; }
    .helped { display: flex; align-items: center; justify-content: space-between; gap: .75rem;
      flex-wrap: wrap; padding: .75rem 1rem; margin-top: 1.5rem; }
  `,
})
export class HelpArticleComponent {
  readonly slug = input.required<string>();
  readonly article = computed(() => HELP_ARTICLES.find((a) => a.slug === this.slug()) ?? null);

  readonly parts = richParts;

  isParagraph(block: HelpBlock): block is { p: string } {
    return 'p' in block;
  }

  isHeading(block: HelpBlock): block is { h: string } {
    return 'h' in block;
  }

  /** Passos numerados ou lista simples. */
  listOf(block: HelpBlock): { ordered: boolean; items: string[] } {
    if ('steps' in block) {
      return { ordered: true, items: block.steps };
    }
    return { ordered: false, items: 'list' in block ? block.list : [] };
  }
}
