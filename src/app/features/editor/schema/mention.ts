import Mention from '@tiptap/extension-mention';
import type { Editor } from '@tiptap/core';
import type { SuggestionKeyDownProps, SuggestionProps } from '@tiptap/suggestion';

/** Algo do universo que pode ser mencionado com "@". */
export interface MentionTarget {
  id: string;
  kind: 'character' | 'place' | 'lore';
  label: string;
  /** "Personagem", "Lugar", "Religião"... */
  hint: string;
}

export type MentionSource = () => MentionTarget[];

const KIND_ICON: Record<MentionTarget['kind'], string> = {
  character: 'pi-user',
  place: 'pi-map-marker',
  lore: 'pi-sun',
};
export const MAX_SUGGESTIONS = 8;

/** Sem acento e sem maiúscula: "@joao" acha "João". */
export function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Quem começa com o que foi digitado vem primeiro; depois quem tem a palavra no meio do nome. */
export function filterTargets(targets: MentionTarget[], query: string): MentionTarget[] {
  const q = normalize(query.trim());
  if (!q) {
    return targets.slice(0, MAX_SUGGESTIONS);
  }
  const starts = targets.filter((t) => normalize(t.label).startsWith(q));
  const words = targets.filter(
    (t) => !starts.includes(t) && normalize(t.label).split(/\s+/).some((w) => w.startsWith(q)),
  );
  return [...starts, ...words].slice(0, MAX_SUGGESTIONS);
}

/**
 * Menção com "@" (§4.1 do produto): vira um nó com {@code id}, {@code kind} e {@code label}, exatamente o que o
 * backend aceita (ManuscriptDocument.mention). O nome vale como texto: conta palavra e sai na exportação.
 * Sem {@code source} (prévia do histórico), só exibe as menções que já existem.
 */
export function mentionExtension(source?: MentionSource) {
  return Mention.extend({
    addAttributes() {
      return {
        id: { default: null, parseHTML: (el) => el.getAttribute('data-id'), renderHTML: (a) => ({ 'data-id': a['id'] }) },
        kind: { default: 'character', parseHTML: (el) => el.getAttribute('data-kind'), renderHTML: (a) => ({ 'data-kind': a['kind'] }) },
        label: { default: '', parseHTML: (el) => el.textContent, renderHTML: () => ({}) },
      };
    },
  }).configure({
    HTMLAttributes: { class: 'mention' },
    renderText: ({ node }) => node.attrs['label'],
    renderHTML: ({ options, node }) => ['span', options.HTMLAttributes, node.attrs['label']],
    deleteTriggerWithBackspace: true,
    suggestion: {
      char: '@',
      allowSpaces: true,
      items: ({ query }) => (source ? filterTargets(source(), query) : []),
      command: ({ editor, range, props }) => {
        const target = props as unknown as MentionTarget;
        editor
          .chain()
          .focus()
          .insertContentAt(range, [
            { type: 'mention', attrs: { id: target.id, kind: target.kind, label: target.label } },
            { type: 'text', text: ' ' },
          ])
          .run();
      },
      render: () => new SuggestionPopup(),
    },
  });
}

/** A lista que aparece ao digitar "@": toque ou setas + Enter para escolher, Esc para fechar. */
class SuggestionPopup {
  private el: HTMLDivElement | null = null;
  private items: MentionTarget[] = [];
  private index = 0;
  private props: SuggestionProps<MentionTarget> | null = null;

  onStart = (props: SuggestionProps<MentionTarget>) => {
    this.el = document.createElement('div');
    this.el.className = 'mention-popup';
    this.el.setAttribute('role', 'listbox');
    this.el.setAttribute('aria-label', 'Mencionar');
    document.body.appendChild(this.el);
    this.onUpdate(props);
  };

  onUpdate = (props: SuggestionProps<MentionTarget>) => {
    this.props = props;
    this.items = props.items;
    this.index = 0;
    this.draw();
    this.place(props);
  };

  onKeyDown = ({ event }: SuggestionKeyDownProps): boolean => {
    if (!this.items.length) {
      return false;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      const step = event.key === 'ArrowDown' ? 1 : -1;
      this.index = (this.index + step + this.items.length) % this.items.length;
      this.draw();
      return true;
    }
    if (event.key === 'Enter' || event.key === 'Tab') {
      this.choose(this.index);
      return true;
    }
    if (event.key === 'Escape') {
      this.onExit();
      return true;
    }
    return false;
  };

  onExit = () => {
    this.el?.remove();
    this.el = null;
  };

  private choose(index: number): void {
    const item = this.items[index];
    if (item && this.props) {
      this.props.command(item as never);
    }
  }

  private draw(): void {
    const el = this.el;
    if (!el) {
      return;
    }
    el.replaceChildren();
    if (!this.items.length) {
      const empty = document.createElement('div');
      empty.className = 'mention-empty';
      empty.textContent = 'Ninguém com esse nome no universo';
      el.appendChild(empty);
      return;
    }
    this.items.forEach((item, i) => {
      const option = document.createElement('button');
      option.type = 'button';
      option.className = 'mention-option' + (i === this.index ? ' on' : '');
      option.setAttribute('role', 'option');
      option.setAttribute('aria-selected', String(i === this.index));
      // mousedown, não click: o editor não perde o foco (o teclado do celular não fecha)
      option.addEventListener('mousedown', (e) => {
        e.preventDefault();
        this.choose(i);
      });
      const icon = document.createElement('i');
      icon.className = `pi ${KIND_ICON[item.kind]}`;
      icon.setAttribute('aria-hidden', 'true');
      const name = document.createElement('span');
      name.className = 'mention-name';
      name.textContent = item.label;
      const hint = document.createElement('small');
      hint.textContent = item.hint;
      option.append(icon, name, hint);
      el.appendChild(option);
    });
  }

  /** Logo abaixo do cursor; se não couber (teclado do celular aberto), logo acima. */
  private place(props: SuggestionProps<MentionTarget>): void {
    const el = this.el;
    const rect = props.clientRect?.();
    if (!el || !rect) {
      return;
    }
    const viewport = window.visualViewport;
    const bottom = viewport ? viewport.offsetTop + viewport.height : window.innerHeight;
    const width = Math.min(280, window.innerWidth - 16);
    el.style.width = `${width}px`;
    el.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - width - 8))}px`;
    const height = el.offsetHeight;
    const below = rect.bottom + 6;
    el.style.top = `${below + height > bottom ? Math.max(8, rect.top - height - 6) : below}px`;
  }
}

/**
 * Atualiza os nomes das menções para o nome atual (personagem renomeado). Devolve quantas mudaram; se mudou, o
 * salvamento automático leva o texto novo.
 */
export function refreshMentionLabels(editor: Editor, targets: MentionTarget[]): number {
  const names = new Map(targets.map((t) => [t.id, t.label]));
  const tr = editor.state.tr;
  let changed = 0;
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === 'mention') {
      const current = names.get(node.attrs['id']);
      if (current && current !== node.attrs['label']) {
        tr.setNodeMarkup(pos, undefined, { ...node.attrs, label: current });
        changed++;
      }
    }
  });
  if (changed) {
    editor.view.dispatch(tr);
  }
  return changed;
}
