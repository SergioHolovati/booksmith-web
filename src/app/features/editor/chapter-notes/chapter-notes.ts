import { Component, computed, inject, input, model, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { Editor } from '@tiptap/core';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { TextareaModule } from 'primeng/textarea';
import { firstValueFrom } from 'rxjs';

import { ManuscriptApi } from '../../../core/api/manuscript.api';
import { problemMessage } from '../../../core/api/problem';
import { ChapterNote } from '../../../core/models/api.models';
import { uuidV4 } from '../../../core/util/uuid';
import { addNoteAnchor, noteAnchors, removeNoteAnchor, setResolvedNotes } from '../schema/comment-anchor';

/** Nota com o trecho atual: na ordem do texto; as sem trecho (apagado) por último. */
export interface NoteView {
  note: ChapterNote;
  quote: string | null;
  orphan: boolean;
  from: number;
}

export function orderNotes(notes: ChapterNote[], anchors: Map<string, { text: string; from: number }>): NoteView[] {
  return notes
    .map((note) => {
      const anchor = anchors.get(note.id);
      return { note, quote: anchor?.text ?? note.quote, orphan: !anchor, from: anchor?.from ?? Number.MAX_SAFE_INTEGER };
    })
    .sort((a, b) => a.from - b.from || a.note.createdAt.localeCompare(b.note.createdAt));
}

/**
 * Painel de notas do capítulo (§4.1 do produto): criar uma nota no trecho selecionado, editar, resolver e excluir.
 * A nota é gravada antes da marca entrar no texto: se a gravação falhar, o texto não fica com marca órfã.
 */
@Component({
  selector: 'app-chapter-notes',
  imports: [FormsModule, ButtonModule, DrawerModule, TextareaModule],
  templateUrl: './chapter-notes.html',
  styleUrl: './chapter-notes.scss',
})
export class ChapterNotesComponent {
  private readonly api = inject(ManuscriptApi);
  private readonly toast = inject(MessageService);

  readonly chapterId = input.required<string>();
  readonly editor = input<Editor | null>(null);
  readonly visible = model(false);

  readonly notes = signal<ChapterNote[]>([]);
  /** Muda a cada abertura do painel e a cada alteração, para recalcular os trechos. */
  private readonly revision = signal(0);
  readonly views = computed(() => {
    this.revision();
    const editor = this.editor();
    return orderNotes(this.notes(), editor ? noteAnchors(editor) : new Map());
  });
  readonly openCount = computed(() => this.notes().filter((n) => !n.resolved).length);

  /** Nota nova: o trecho selecionado no editor quando o botão foi tocado. */
  readonly draft = signal<{ from: number; to: number; quote: string } | null>(null);
  readonly focused = signal<string | null>(null);
  readonly editing = signal<string | null>(null);
  readonly busy = signal(false);
  newBody = '';
  editBody = '';

  constructor() {
    queueMicrotask(() => void this.load());
  }

  async load(): Promise<void> {
    try {
      this.notes.set(await firstValueFrom(this.api.listNotes(this.chapterId())));
      this.syncResolved();
    } catch {
      // o editor funciona sem as notas
    }
  }

  /** Abre o painel numa nota nova para o trecho selecionado. */
  startNew(from: number, to: number, quote: string): void {
    this.draft.set({ from, to, quote });
    this.newBody = '';
    this.focused.set(null);
    this.open();
  }

  /** Abre o painel com a nota tocada no texto em destaque. */
  focus(id: string): void {
    this.draft.set(null);
    this.focused.set(id);
    this.open();
  }

  open(): void {
    this.revision.update((n) => n + 1);
    this.visible.set(true);
  }

  async create(): Promise<void> {
    const draft = this.draft();
    const editor = this.editor();
    const body = this.newBody.trim();
    if (!draft || !editor || !body) {
      return;
    }
    const id = uuidV4();
    this.busy.set(true);
    try {
      const note = await firstValueFrom(this.api.createNote(this.chapterId(), { id, body, quote: draft.quote }));
      addNoteAnchor(editor, draft.from, draft.to, id); // o autosave leva a marca
      this.notes.update((list) => [...list, note]);
      this.draft.set(null);
      this.focused.set(id);
      this.revision.update((n) => n + 1);
    } catch (error) {
      this.toast.add({ severity: 'error', summary: problemMessage(error, 'Não foi possível salvar a nota.'), life: 5000 });
    } finally {
      this.busy.set(false);
    }
  }

  cancelNew(): void {
    this.draft.set(null);
  }

  startEdit(note: ChapterNote): void {
    this.editing.set(note.id);
    this.editBody = note.body;
  }

  async saveEdit(note: ChapterNote): Promise<void> {
    const body = this.editBody.trim();
    if (!body) {
      return;
    }
    await this.change(note, { body });
    this.editing.set(null);
  }

  async toggleResolved(note: ChapterNote): Promise<void> {
    await this.change(note, { resolved: !note.resolved });
  }

  async remove(note: ChapterNote): Promise<void> {
    this.busy.set(true);
    try {
      await firstValueFrom(this.api.deleteNote(note.id));
      const editor = this.editor();
      if (editor) {
        removeNoteAnchor(editor, note.id);
      }
      this.notes.update((list) => list.filter((n) => n.id !== note.id));
      this.revision.update((n) => n + 1);
      this.syncResolved();
    } catch (error) {
      this.toast.add({ severity: 'error', summary: problemMessage(error), life: 5000 });
    } finally {
      this.busy.set(false);
    }
  }

  /** Leva o cursor ao trecho da nota no texto. */
  goTo(view: NoteView): void {
    const editor = this.editor();
    if (!editor || view.orphan) {
      return;
    }
    this.visible.set(false);
    editor.chain().focus().setTextSelection(view.from).scrollIntoView().run();
  }

  private async change(note: ChapterNote, change: { body?: string; resolved?: boolean }): Promise<void> {
    this.busy.set(true);
    try {
      const saved = await firstValueFrom(this.api.updateNote(note.id, change));
      this.notes.update((list) => list.map((n) => (n.id === saved.id ? saved : n)));
      this.syncResolved();
    } catch (error) {
      this.toast.add({ severity: 'error', summary: problemMessage(error), life: 5000 });
    } finally {
      this.busy.set(false);
    }
  }

  private syncResolved(): void {
    const editor = this.editor();
    if (editor) {
      setResolvedNotes(editor, new Set(this.notes().filter((n) => n.resolved).map((n) => n.id)));
    }
  }
}
