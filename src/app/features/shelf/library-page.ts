import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { firstValueFrom } from 'rxjs';

import { problemMessage } from '../../core/api/problem';
import { ShelfApi, WorkCard } from '../../core/api/shelf.api';
import { ShelfHeaderComponent } from './shelf-header';
import { WorkCardsComponent } from './work-cards';

/** Biblioteca (`/estante/biblioteca`, com login): as obras guardadas e as lidas, da mais recente para a mais antiga. */
@Component({
  selector: 'app-library-page',
  imports: [RouterLink, ProgressSpinnerModule, ShelfHeaderComponent, WorkCardsComponent],
  template: `
    <app-shelf-header />
    <main class="shelf">
      <h1 class="title">Biblioteca</h1>
      <p class="muted lead">O que você guardou ou começou a ler.</p>
      @if (chapterEmails() !== null) {
        <label class="emails glass-card">
          <input type="checkbox" [checked]="chapterEmails()" (change)="toggleEmails()" data-chapter-emails />
          <span class="small">Receber e-mail quando quem eu sigo publicar capítulo novo</span>
        </label>
      }
      @if (works(); as list) {
        @if (list.length === 0) {
          <p class="muted empty" data-library-empty>Nada por aqui ainda. <a routerLink="/estante">Explore a Estante</a>.</p>
        } @else {
          <app-work-cards [works]="list" data-library />
        }
      } @else if (error(); as text) {
        <p class="muted">{{ text }}</p>
      } @else {
        <div class="center"><p-progress-spinner strokeWidth="4" /></div>
      }
    </main>
  `,
  styleUrl: './shelf.scss',
  styles: `
    .title { margin: 1rem 0 .2rem; font-size: 1.5rem; }
    .lead { margin: 0 0 1rem; }
    .emails { display: flex; align-items: center; gap: .6rem; padding: .7rem .9rem; margin-bottom: 1rem; min-height: var(--bs-touch); }
  `,
})
export class LibraryPageComponent {
  private readonly api = inject(ShelfApi);
  readonly works = signal<WorkCard[] | null>(null);
  readonly error = signal<string | null>(null);
  readonly chapterEmails = signal<boolean | null>(null);

  constructor() {
    queueMicrotask(async () => {
      try {
        this.works.set(await firstValueFrom(this.api.myLibrary()));
        this.chapterEmails.set((await firstValueFrom(this.api.preferences())).chapterEmails);
      } catch (error) {
        this.error.set(problemMessage(error, 'Não foi possível abrir a biblioteca.'));
      }
    });
  }

  async toggleEmails(): Promise<void> {
    const next = !this.chapterEmails();
    this.chapterEmails.set(next);
    try {
      await firstValueFrom(this.api.savePreferences(next));
    } catch {
      this.chapterEmails.set(!next);
    }
  }
}
