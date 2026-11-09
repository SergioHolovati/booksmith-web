import { Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';

import { AppearanceField, AppearanceValue } from '../../core/models/api.models';
import { asList, isCustom } from '../../features/characters/appearance-values';

/**
 * Um campo de formulário definido por dados (montador de personagem, construtor de universo): opções em
 * chips, cores em amostras, escala deslizante (com polos, no temperamento), texto curto ou longo, e "Outro"
 * para texto livre. Emite o valor novo; `null` limpa o campo.
 */
@Component({
  selector: 'app-builder-field',
  imports: [FormsModule, ButtonModule, InputTextModule, TextareaModule],
  templateUrl: './builder-field.html',
  styleUrl: './builder-field.scss',
})
export class BuilderFieldComponent {
  readonly field = input.required<AppearanceField>();
  readonly value = input<AppearanceValue | undefined>(undefined);
  readonly valueChange = output<AppearanceValue | null>();

  /** "Outro" aberto para digitar, antes de haver texto. */
  private readonly customOpen = signal(false);

  readonly list = computed(() => asList(this.value()));
  /** Valor livre ("Outro") atual do campo de escolha única, ou vazio. */
  readonly customValue = computed(() => {
    const value = this.value();
    return isCustom(this.field(), value) ? value : '';
  });
  readonly isCustomOpen = computed(() => this.customOpen() || this.customValue() !== '');
  /** Valores livres de um campo múltiplo (os que não são opções). */
  readonly customItems = computed(() => this.list().filter((v) => isCustom(this.field(), v)));
  readonly scaleLabel = computed(() => {
    const field = this.field();
    const value = this.value();
    return typeof value === 'number' ? (field.labels?.[value - (field.min ?? 1)] ?? String(value)) : 'Não definida';
  });
  readonly scalePosition = computed(() => {
    const field = this.field();
    const value = this.value();
    return typeof value === 'number' ? value : Math.round(((field.min ?? 1) + (field.max ?? 5)) / 2);
  });

  /** Escolha única: tocar na opção já escolhida desmarca. */
  choose(option: string): void {
    this.customOpen.set(false);
    this.valueChange.emit(this.value() === option ? null : option);
  }

  /** Escolha múltipla: liga ou desliga, mantendo a ordem em que foram marcadas. */
  toggle(option: string): void {
    const current = this.list();
    const next = current.includes(option) ? current.filter((v) => v !== option) : [...current, option];
    this.valueChange.emit(next.length === 0 ? null : next);
  }

  setText(text: string): void {
    this.valueChange.emit(text.trim() === '' ? null : text);
  }

  setScale(value: number | null): void {
    this.valueChange.emit(value);
  }

  openCustom(): void {
    if (this.field().type !== 'multi' && !isCustom(this.field(), this.value())) {
      this.valueChange.emit(null);
    }
    this.customOpen.set(true);
  }

  addCustomItem(input: HTMLInputElement): void {
    const text = input.value.trim();
    if (text && !this.list().includes(text)) {
      this.toggle(text);
    }
    input.value = '';
  }
}
