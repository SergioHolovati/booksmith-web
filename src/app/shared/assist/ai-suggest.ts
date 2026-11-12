import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { firstValueFrom } from 'rxjs';

import { AssistApi } from '../../core/api/assist.api';
import { problemMessage } from '../../core/api/problem';
import { ContextLine, Suggestion, SuggestionKind, SuggestionMode } from '../../core/models/api.models';
import { copyText } from '../../core/util/copy-text';
import { ideaText } from './ideas';

/**
 * "Ideias da IA" para um campo: a IA sugere possibilidades ou faz perguntas, e o autor decide. Nada entra no
 * texto sozinho: "Usar no campo" acrescenta a ideia ao fim do campo, para o autor reescrever do jeito dele.
 * Escondido quando a IA está desligada. O contexto (o resto da ficha na tela) é lido só na hora do pedido.
 */
@Component({
  selector: 'app-ai-suggest',
  imports: [FormsModule, ButtonModule, InputTextModule, ProgressSpinnerModule],
  templateUrl: './ai-suggest.html',
  styleUrl: './ai-suggest.scss',
})
export class AiSuggestComponent {
  private readonly api = inject(AssistApi);
  private readonly toast = inject(MessageService);

  readonly kind = input.required<SuggestionKind>();
  readonly field = input.required<string>();
  readonly fieldLabel = input('');
  readonly universeId = input<string | null>(null);
  readonly bookId = input<string | null>(null);
  /** O que já está escrito no campo (mesmo sem salvar). */
  readonly current = input('');
  /** O resto da tela, montado na hora do pedido. */
  readonly context = input<() => ContextLine[]>(() => []);
  /** Mostra "Usar no campo" (fichas); no enredo só dá para copiar. */
  readonly appendable = input(true);
  /** Texto do botão fechado. */
  readonly label = input('Ideias da IA');
  /** Já abre o painel (o enredo tem o próprio cartão). */
  readonly startOpen = input(false);

  readonly use = output<string>();

  private readonly opened = signal(false);
  readonly open = computed(() => this.opened() || this.startOpen());
  readonly mode = signal<SuggestionMode>('ideas');
  readonly hint = signal('');
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly suggestions = signal<Suggestion[]>([]);
  readonly askedMode = signal<SuggestionMode>('ideas');
  readonly used = signal<ReadonlySet<number>>(new Set());

  readonly status = this.api.status;
  readonly enabled = computed(() => this.status()?.enabled === true);

  constructor() {
    void this.api.ensureStatus();
  }

  toggle(): void {
    this.opened.update((o) => !o);
  }

  setMode(mode: SuggestionMode): void {
    this.mode.set(mode);
  }

  async ask(): Promise<void> {
    if (this.loading()) {
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    const mode = this.mode();
    try {
      const result = await firstValueFrom(
        this.api.suggest({
          kind: this.kind(),
          mode,
          universeId: this.universeId(),
          bookId: this.bookId(),
          field: this.field(),
          fieldLabel: this.fieldLabel(),
          current: this.current(),
          context: this.context()().filter((line) => line.text.trim() !== ''),
          hint: this.hint().trim(),
        }),
      );
      this.suggestions.set(result.suggestions);
      this.askedMode.set(mode);
      this.used.set(new Set());
    } catch (error) {
      this.error.set(problemMessage(error, 'Não foi possível pedir sugestões agora.'));
    } finally {
      this.loading.set(false);
    }
  }

  /** Acrescenta ao campo: "Título: texto" vira um parágrafo novo, para o autor reescrever. */
  useIdea(index: number, idea: Suggestion): void {
    this.use.emit(ideaText(idea));
    this.used.update((set) => new Set(set).add(index));
  }

  async copy(idea: Suggestion): Promise<void> {
    const ok = await copyText(idea.title ? `${idea.title}\n${idea.text}` : idea.text);
    this.toast.add({
      severity: ok ? 'success' : 'warn',
      summary: ok ? 'Copiado' : 'Não deu para copiar. Selecione o texto e copie.',
      life: 2000,
    });
  }
}
