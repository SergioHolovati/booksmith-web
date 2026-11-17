import { Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { firstValueFrom } from 'rxjs';

import { ManuscriptApi } from '../../../core/api/manuscript.api';
import { problemMessage } from '../../../core/api/problem';
import { BookDetail, OutlineItem } from '../../../core/models/api.models';
import { OUTLINE_KINDS } from '../file-import/import-structure';
import { OutlineTemplate, templatesFor } from './outline-templates';

export const OUTLINE_EXAMPLE = `Apresentação
Parte 1 - O chamado
Introdução
Capítulo 1 - Seja cheio do Espírito
  1.1 - Natureza divina
  1.2 - O poder do Espírito
Capítulo 2 - Existe um legado
Conclusão`;

/** Quantos capítulos (com e sem número) o sumário vai criar. */
export function outlineChapters(items: OutlineItem[]): number {
  return items.filter((i) => (i.kind === 'chapter' || i.kind === 'unnumbered') && i.title.trim()).length;
}

/**
 * "Criar pelo sumário" (`/books/:id/sumario`): o escritor cola o sumário (uma linha por capítulo; "Parte 1",
 * "2.1 - …" e linhas recuadas viram parte e subcapítulo), revisa e o Booksmith cria os capítulos vazios no fim do
 * livro, com os subcapítulos como títulos dentro de cada um.
 */
@Component({
  selector: 'app-outline-builder',
  imports: [RouterLink, FormsModule, ButtonModule, MessageModule],
  template: `
    <div class="page narrow">
      <a [routerLink]="['/books', bookId()]" class="back-link"><i class="pi pi-arrow-left"></i>
        {{ book()?.title ?? 'Livro' }}</a>
      <div class="page-header">
        <div>
          <h1 class="page-title">Criar pelo sumário</h1>
          <p class="page-subtitle">Cole ou escreva o sumário do livro. Criamos os capítulos vazios, com as partes e os
            subcapítulos, prontos para escrever. Os capítulos entram no fim do livro.</p>
        </div>
      </div>

      @if (error(); as text) {
        <p-message severity="error" [text]="text" styleClass="block-message" />
      }

      @if (items().length === 0) {
        <div class="templates" data-outline-templates>
          <span class="field-label">Começar de um modelo</span>
          <div class="template-list">
            @for (t of templates(); track t.id) {
              <button type="button" class="template" [class.on]="template() === t.id" (click)="useTemplate(t)"
                [attr.data-template]="t.id">
                <strong>{{ t.name }}</strong>
                <span class="muted small">{{ t.hint }}</span>
              </button>
            }
          </div>
        </div>
        <label for="outline-text" class="field-label">Sumário (uma linha por capítulo)</label>
        <textarea id="outline-text" class="bs-input outline-text" rows="12" maxlength="40000" [(ngModel)]="text"
          [placeholder]="example"></textarea>
        <p class="muted small">"Parte 1" vira parte; "Introdução", "Apresentação" e "Conclusão" viram capítulos sem
          número; "1.1 - …" ou linhas com espaço no começo viram subcapítulos. Números de página no fim são ignorados.</p>
        <div class="actions">
          <p-button label="Ver a estrutura" icon="pi pi-list" styleClass="full-width" [loading]="busy()"
            [disabled]="!text.trim()" (onClick)="preview()" />
        </div>
      } @else {
        <p class="totals" data-outline-total><strong>{{ chapters() }} {{ chapters() === 1 ? 'capítulo' : 'capítulos' }}</strong>
          · {{ items().length }} itens</p>
        <ol class="outline" data-outline-items>
          @for (item of items(); track $index; let i = $index) {
            <li class="outline-item" [class.section]="item.kind === 'section'" [class.part]="item.kind === 'part'">
              <select class="kind-select" [attr.aria-label]="'Tipo de ' + item.title" [ngModel]="item.kind"
                (ngModelChange)="set(i, { kind: $event })">
                @for (k of kinds; track k.value) {
                  <option [value]="k.value">{{ k.label }}</option>
                }
              </select>
              <input class="title-input" [attr.aria-label]="'Título de ' + item.title" maxlength="200"
                [ngModel]="item.title" (ngModelChange)="set(i, { title: $event })" />
              <button type="button" class="remove" [attr.aria-label]="'Tirar ' + item.title" (click)="remove(i)">
                <i class="pi pi-times" aria-hidden="true"></i>
              </button>
            </li>
          }
        </ol>
        <div class="actions">
          <p-button [label]="chapters() === 1 ? 'Criar 1 capítulo' : 'Criar ' + chapters() + ' capítulos'"
            icon="pi pi-check" styleClass="full-width" [loading]="busy()" [disabled]="chapters() === 0"
            (onClick)="create()" data-create />
          <p-button label="Voltar ao texto" severity="secondary" [text]="true" [disabled]="busy()"
            (onClick)="items.set([])" />
        </div>
      }
    </div>
  `,
  styles: `
    .narrow { max-width: 720px; }
    .templates { margin-bottom: 1rem; }
    .template-list { display: flex; gap: .5rem; overflow-x: auto; padding-bottom: .3rem; }
    .template { flex: 0 0 11rem; display: flex; flex-direction: column; gap: .2rem; text-align: left;
      padding: .6rem .7rem; border: 1px solid var(--bs-border); border-radius: var(--bs-radius-sm);
      background: var(--bs-surface); color: var(--bs-text); font: inherit; cursor: pointer; }
    .template.on { border-color: var(--bs-ember); }
    .back-link { display: inline-flex; align-items: center; gap: .4rem; min-height: var(--bs-touch); color: var(--bs-ember); }
    .outline-text { width: 100%; font-family: inherit; line-height: 1.5; }
    .actions { display: flex; flex-direction: column; gap: .5rem; margin-top: 1rem; }
    .outline { display: flex; flex-direction: column; gap: .4rem; margin: 0; padding: 0; list-style: none; }
    .outline-item { display: grid; grid-template-columns: 7.5rem minmax(0, 1fr) auto; gap: .4rem; align-items: center; }
    .outline-item.section { padding-left: 1rem; }
    .outline-item.part .title-input { font-weight: 700; }
    .kind-select, .title-input { min-height: 38px; padding: .3rem .5rem; border: 1px solid var(--bs-border);
      border-radius: var(--bs-radius-sm); background: var(--bs-surface); color: var(--bs-text); font: inherit; min-width: 0; }
    .title-input { width: 100%; }
    .remove { min-width: var(--bs-touch); min-height: var(--bs-touch); border: 0; background: none; color: var(--bs-muted); cursor: pointer; }
  `,
})
export class OutlineBuilderComponent {
  private readonly api = inject(ManuscriptApi);
  private readonly router = inject(Router);
  private readonly toast = inject(MessageService);

  readonly bookId = input.required<string>();
  readonly book = signal<BookDetail | null>(null);
  readonly items = signal<OutlineItem[]>([]);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly kinds = OUTLINE_KINDS;
  readonly example = OUTLINE_EXAMPLE;
  readonly chapters = computed(() => outlineChapters(this.items()));
  /** Os modelos de estrutura, com os do gênero do livro primeiro. */
  readonly templates = computed(() => templatesFor(this.book()?.genre));
  readonly template = signal<string | null>(null);
  text = '';

  /** Preenche o sumário com o modelo; o autor ajusta o texto antes de ver a estrutura. */
  useTemplate(template: OutlineTemplate): void {
    this.text = template.text;
    this.template.set(template.id);
  }

  constructor() {
    queueMicrotask(() => void this.loadBook());
  }

  private async loadBook(): Promise<void> {
    try {
      this.book.set(await firstValueFrom(this.api.getBook(this.bookId())));
    } catch (error) {
      this.error.set(problemMessage(error, 'Não foi possível abrir o livro.'));
    }
  }

  async preview(): Promise<void> {
    await this.run(async () => this.items.set(await firstValueFrom(this.api.previewOutline(this.bookId(), this.text))));
  }

  set(position: number, change: Partial<OutlineItem>): void {
    this.items.update((list) => list.map((item, i) => (i === position ? { ...item, ...change } : item)));
  }

  remove(position: number): void {
    this.items.update((list) => list.filter((_, i) => i !== position));
  }

  async create(): Promise<void> {
    await this.run(async () => {
      const items = this.items().filter((i) => i.title.trim()).map((i) => ({ kind: i.kind, title: i.title.trim() }));
      const result = await firstValueFrom(this.api.createFromOutline(this.bookId(), items));
      const count = result.chapters.length;
      this.toast.add({ severity: 'success', summary: count === 1 ? '1 capítulo criado' : `${count} capítulos criados`, life: 4000 });
      await this.router.navigate(['/books', this.bookId()]);
    });
  }

  private async run(action: () => Promise<void>): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      await action();
    } catch (error) {
      this.error.set(problemMessage(error, 'Não foi possível concluir.'));
    } finally {
      this.busy.set(false);
    }
  }
}
