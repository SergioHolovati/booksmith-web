import {
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Editor, type JSONContent } from '@tiptap/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { firstValueFrom } from 'rxjs';

import { ManuscriptApi } from '../../../core/api/manuscript.api';
import { WritingApi, streakAfterToday } from '../../../core/api/writing.api';
import { isNetworkError, problemMessage } from '../../../core/api/problem';
import { Chapter, WritingStats } from '../../../core/models/api.models';
import { DraftStore } from '../../../core/util/draft-store';
import { countWords, formatCount } from '../../../core/util/word-count';
import { canonicalJson } from '../schema/canonical-json';
import { manuscriptExtensions } from '../schema/manuscript-extensions';
import { MentionTarget, refreshMentionLabels } from '../schema/mention';
import { UniverseApi } from '../../../core/api/universe.api';
import { ChapterHistoryComponent, HistoryActions } from '../chapter-history/chapter-history';
import { ChapterNotesComponent } from '../chapter-notes/chapter-notes';
import { noteAt } from '../schema/comment-anchor';
import { proofreadOffParagraph } from '../schema/proofread-off';
import { PlacedIssue, Proofread, issueAt } from '../proofread/proofread';
import { Proofreader } from '../proofread/proofreader';
import { ProofreadPanelComponent } from '../proofread/proofread-panel';
import { IllustrationPickerComponent } from '../illustration/illustration-picker';
import { IllustrationPanelComponent } from '../illustration/illustration-panel';
import { ILLUSTRATIONS_LOADED } from '../schema/illustration';
import { NodeSelection } from '@tiptap/pm/state';
import { UniverseImage } from '../../../core/models/api.models';
import { ChapterAutosave, SaveStatus } from './chapter-autosave';
import { MessageService } from 'primeng/api';

interface ToolbarState {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  heading: boolean;
  blockquote: boolean;
  indent: boolean;
  proofreadOff: boolean;
  canUndo: boolean;
  canRedo: boolean;
}

const STATUS_LABEL: Record<SaveStatus, string> = {
  saved: 'Salvo',
  pending: 'Alterações não salvas',
  saving: 'Salvando…',
  offline: 'Sem conexão — salvo no aparelho',
  conflict: 'Conflito de versões',
  error: 'Erro ao salvar — salvo no aparelho',
};

const LORE_HINT: Record<string, string> = {
  religion: 'Religião',
  government: 'Governo',
  language: 'Idioma',
  organization: 'Organização',
  creature: 'Criatura',
  object: 'Objeto',
  term: 'Termo',
};

@Component({
  selector: 'app-chapter-editor',
  imports: [FormsModule, ButtonModule, DialogModule, ProgressSpinnerModule, ChapterHistoryComponent, ChapterNotesComponent, ProofreadPanelComponent, IllustrationPickerComponent, IllustrationPanelComponent],
  templateUrl: './chapter-editor.html',
  styleUrl: './chapter-editor.scss',
  host: {
    '[style.--keyboard-offset.px]': 'keyboardOffset()',
    '(window:beforeunload)': 'onBeforeUnload($event)',
    '(document:visibilitychange)': 'onVisibilityChange()',
  },
})
export class ChapterEditorComponent {
  private readonly api = inject(ManuscriptApi);
  private readonly drafts = inject(DraftStore);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly editorHost = viewChild<ElementRef<HTMLElement>>('editorHost');

  readonly chapterId = input.required<string>();
  /** Parágrafo para mostrar ao abrir (?block=…), vindo de um alerta de continuidade. */
  readonly block = input<string | undefined>();

  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly bookId = signal<string | null>(null);
  readonly title = signal('');
  /** Idioma do livro: define o dicionário do corretor ortográfico do navegador. */
  readonly language = signal('pt-BR');
  readonly words = signal(0);
  /** Personagens, lugares e fichas do universo do livro, para o "@". */
  private readonly universeApi = inject(UniverseApi);
  private mentionTargets: MentionTarget[] = [];
  /** Meta do dia: as palavras de hoje quando o capítulo abriu, mais o que mudou desde então neste capítulo. */
  private readonly writing = inject(WritingApi);
  private readonly writingStats = signal<WritingStats | null>(null);
  private wordsAtOpen = 0;
  private goalCelebrated = false;
  readonly todayWords = computed(() => {
    const stats = this.writingStats();
    return stats ? Math.max(0, stats.today + this.words() - this.wordsAtOpen) : null;
  });
  readonly goalLabel = computed(() => {
    const stats = this.writingStats();
    const today = this.todayWords();
    return stats?.goal && today !== null ? `${formatCount(today)} de ${formatCount(stats.goal)} hoje` : null;
  });
  readonly goalReached = computed(() => {
    const goal = this.writingStats()?.goal;
    return !!goal && (this.todayWords() ?? 0) >= goal;
  });
  readonly focusMode = signal(false);
  readonly keyboardOffset = signal(0);
  readonly toolbar = signal<ToolbarState>({
    bold: false, italic: false, underline: false, heading: false, blockquote: false, indent: false, proofreadOff: false,
    canUndo: false, canRedo: false,
  });

  readonly conflictServer = signal<Chapter | null>(null);
  readonly resolving = signal(false);
  readonly historyOpen = signal(false);
  readonly notesOpen = signal(false);
  /** Ilustrações: o universo do livro (para a biblioteca), o endereço de cada imagem e a selecionada no texto. */
  readonly universeId = signal<string | null>(null);
  readonly pickerOpen = signal(false);
  readonly selectedIllustration = signal<{ pos: number; caption: string | null } | null>(null);
  private readonly imageUrls = new Map<string, string>();
  /** Corretor próprio: o erro tocado (painel de sugestões) e o corretor em si, criado com o editor. */
  readonly issue = signal<PlacedIssue | null>(null);
  private proofreader: Proofreader | null = null;
  /** O editor para o painel de notas (o campo `editor` não é um signal). */
  readonly editorRef = signal<Editor | null>(null);
  private readonly notesPanel = viewChild(ChapterNotesComponent);
  readonly openNotes = computed(() => this.notesPanel()?.openCount() ?? 0);
  private readonly toast = inject(MessageService);

  /** O histórico passa pela fila do autosave: o texto pendente é enviado antes de salvar ou restaurar versões. */
  readonly historyActions: HistoryActions = {
    saveVersion: async (label) => {
      await this.requireAutosave().saveNamedVersion(label);
      this.toast.add({ severity: 'success', summary: 'Versão salva', life: 2500 });
    },
    restore: async (versionId) => {
      const restored = await this.requireAutosave().restoreVersion(versionId);
      this.editor?.commands.setContent(restored.content, { emitUpdate: false });
      this.updateWords();
      this.toast.add({
        severity: 'success',
        summary: 'Versão restaurada',
        detail: 'O texto anterior ficou guardado no histórico.',
        life: 3500,
      });
    },
  };

  private requireAutosave(): ChapterAutosave {
    if (!this.autosave) {
      throw new Error('O editor ainda está carregando.');
    }
    return this.autosave;
  }

  private editor: Editor | null = null;
  private savedTitle = '';
  /** Em signal para que status e erro (signals do ChapterAutosave) sejam acompanhados pelo template. */
  private readonly autosaveRef = signal<ChapterAutosave | null>(null);

  readonly status = computed<SaveStatus>(() => this.autosaveRef()?.status() ?? 'saved');
  readonly statusLabel = computed(() => STATUS_LABEL[this.status()]);
  readonly errorMessage = computed(() => this.autosaveRef()?.errorMessage() ?? null);
  readonly wordsLabel = computed(() => `${formatCount(this.words())} ${this.words() === 1 ? 'palavra' : 'palavras'}`);
  readonly showConflict = computed(() => this.status() === 'conflict');

  private get autosave(): ChapterAutosave | null {
    return this.autosaveRef();
  }

  constructor() {
    const destroyRef = inject(DestroyRef);
    const viewport = window.visualViewport;
    const updateKeyboard = () => {
      // iOS não redimensiona a página ao abrir o teclado: a barra precisa subir sozinha
      if (viewport) {
        this.keyboardOffset.set(Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop));
      }
    };
    viewport?.addEventListener('resize', updateKeyboard);
    viewport?.addEventListener('scroll', updateKeyboard);

    destroyRef.onDestroy(() => {
      viewport?.removeEventListener('resize', updateKeyboard);
      viewport?.removeEventListener('scroll', updateKeyboard);
      void this.autosave?.flush().finally(() => this.autosave?.dispose());
      this.proofreader?.destroy();
      this.editor?.destroy();
    });

    queueMicrotask(() => void this.load());
  }

  private async load(): Promise<void> {
    const chapterId = this.chapterId();
    const draft = await this.drafts.get(chapterId);

    let chapter: Chapter | null = null;
    try {
      chapter = await firstValueFrom(this.api.getChapter(chapterId));
    } catch (error) {
      if (!(isNetworkError(error) && draft)) {
        this.loadError.set(problemMessage(error, 'Não foi possível abrir o capítulo.'));
        this.loading.set(false);
        return;
      }
    }

    // Sem rede, mas com rascunho local: abre o rascunho e sincroniza quando a conexão voltar
    const baseVersion = chapter?.version ?? draft!.baseVersion;
    let content: JSONContent = chapter?.content ?? draft!.content;
    let state: 'clean' | 'unsynced' | 'conflict' | 'offline' = chapter ? 'clean' : 'offline';

    if (chapter && draft) {
      if (canonicalJson(draft.content) === canonicalJson(chapter.content)) {
        await this.drafts.delete(chapterId); // rascunho já estava no servidor
      } else if (draft.baseVersion === chapter.version) {
        content = draft.content;
        state = 'unsynced';
      } else {
        content = draft.content;
        state = 'conflict';
        this.conflictServer.set(chapter);
      }
    }

    this.bookId.set(chapter?.bookId ?? null);
    this.title.set(chapter?.title ?? '');
    this.language.set(chapter?.language ?? 'pt-BR');
    this.savedTitle = this.title();
    this.loading.set(false);

    // O host do editor só existe depois que o template renderiza o estado carregado
    afterNextRender(() => this.createEditor(chapterId, baseVersion, content, state), { injector: this.injector });
  }

  private createEditor(
    chapterId: string,
    baseVersion: number,
    content: JSONContent,
    state: 'clean' | 'unsynced' | 'conflict' | 'offline',
  ): void {
    const host = this.editorHost()?.nativeElement;
    if (!host) {
      return;
    }

    this.editor = new Editor({
      element: host,
      extensions: [
        ...manuscriptExtensions('Comece a escrever… (@ menciona um personagem ou lugar)', () => this.mentionTargets, () => this.imageUrls),
        Proofread,
      ],
      content,
      editorProps: {
        attributes: {
          class: 'manuscript',
          spellcheck: 'true',
          lang: this.language(),
          autocapitalize: 'sentences',
          'aria-label': 'Texto do capítulo',
        },
        // Tocar num trecho com nota abre a nota (o cursor continua indo para onde a pessoa tocou)
        handleClick: (view, pos) => {
          // Erro do corretor tem prioridade: o toque abre as sugestões
          const found = issueAt(view.state, pos);
          this.issue.set(found);
          if (found) {
            return false;
          }
          const id = this.editor ? noteAt(this.editor, pos) : null;
          if (id) {
            this.notesPanel()?.focus(id);
          }
          return false;
        },
      },
      onUpdate: () => {
        this.autosave?.markChanged();
        this.updateWords();
        this.proofreader?.schedule();
        this.issue.set(null);
      },
      onTransaction: () => {
        this.updateToolbar();
        this.updateSelectedIllustration();
      },
    });

    this.editorRef.set(this.editor);
    // Com o corretor próprio no ar, o do navegador sai (senão o texto fica com dois sublinhados)
    this.proofreader = new Proofreader(this.editor, chapterId, this.api, (available) =>
      this.editor?.view.dom.setAttribute('spellcheck', available ? 'false' : 'true'),
    );
    this.proofreader.schedule(300);
    const autosave = new ChapterAutosave(chapterId, baseVersion, this.api, this.drafts, () => this.editor!.getJSON());
    this.autosaveRef.set(autosave);

    if (state === 'unsynced' || state === 'offline') {
      autosave.resumeUnsyncedDraft();
    } else if (state === 'conflict') {
      autosave.enterConflict();
    }

    this.updateWords();
    this.updateToolbar();
    this.wordsAtOpen = this.words();
    void this.loadWritingStats();
    void this.loadMentionTargets();
    this.revealBlock(host);
  }

  /**
   * Rola até o parágrafo indicado e o destaca por alguns segundos. O destaque é uma regra de estilo
   * temporária, e não uma classe no parágrafo: o ProseMirror desfaz mudanças feitas à mão no DOM dele.
   */
  private revealBlock(host: HTMLElement): void {
    const id = this.block();
    if (!id) {
      return;
    }
    const element = host.querySelector<HTMLElement>(`[data-block-id="${CSS.escape(id)}"]`);
    if (!element) {
      return;
    }
    element.scrollIntoView({ block: 'center' });
    const style = document.createElement('style');
    style.dataset['reveal'] = id;
    style.textContent = `.manuscript [data-block-id="${CSS.escape(id)}"] {
      border-radius: 6px;
      background: rgba(234, 152, 70, .18);
      box-shadow: 0 0 0 6px rgba(234, 152, 70, .18);
    }`;
    document.head.appendChild(style);
    setTimeout(() => style.remove(), 5000);
  }

  // ===== Barra de formatação =====

  toggleBold(): void {
    this.editor?.chain().focus().toggleBold().run();
  }

  toggleItalic(): void {
    this.editor?.chain().focus().toggleItalic().run();
  }

  toggleUnderline(): void {
    this.editor?.chain().focus().toggleUnderline().run();
  }

  toggleHeading(): void {
    this.editor?.chain().focus().toggleHeading({ level: 2 }).run();
  }

  toggleQuote(): void {
    this.editor?.chain().focus().toggleBlockquote().run();
  }

  /** No celular não há tecla Tab: o recuo também fica na barra. */
  toggleIndent(): void {
    this.editor?.chain().focus().toggleParagraphIndent().run();
  }

  applySuggestion(issue: PlacedIssue, replacement: string): void {
    this.proofreader?.apply(issue, replacement);
    this.issue.set(null);
  }

  /** Atalho do painel: o parágrafo do erro sai da revisão (fala de personagem que fala errado). */
  skipParagraph(issue: PlacedIssue): void {
    if (this.editor) {
      proofreadOffParagraph(this.editor, issue.from);
    }
    this.issue.set(null);
  }

  toggleProofreadOff(): void {
    this.editor?.chain().focus().toggleProofreadOff().run();
  }

  ignoreIssue(issue: PlacedIssue): void {
    this.proofreader?.ignore(issue);
    this.issue.set(null);
  }

  /** A palavra entra no dicionário do livro e deixa de ser marcada em todos os capítulos. */
  async addToDictionary(issue: PlacedIssue): Promise<void> {
    const bookId = this.bookId();
    if (!bookId) {
      return;
    }
    try {
      await firstValueFrom(this.api.addDictionaryWord(bookId, issue.word));
      this.proofreader?.accept(issue.word);
      this.issue.set(null);
      this.toast.add({ severity: 'success', summary: `"${issue.word}" no dicionário do livro`, life: 2500 });
    } catch (error) {
      this.toast.add({ severity: 'error', summary: problemMessage(error), life: 5000 });
    }
  }

  openIllustrationPicker(): void {
    if (!this.universeId()) {
      this.toast.add({ severity: 'info', summary: 'Abrindo a biblioteca do universo… tente de novo em instantes', life: 3000 });
      return;
    }
    this.pickerOpen.set(true);
  }

  insertIllustration(image: UniverseImage): void {
    this.imageUrls.set(image.id, image.url);
    this.editor?.chain().focus().insertIllustration({ imageId: image.id, caption: image.caption }).run();
  }

  setIllustrationCaption(caption: string): void {
    const selected = this.selectedIllustration();
    const editor = this.editor;
    if (!selected || !editor) {
      return;
    }
    const node = editor.state.doc.nodeAt(selected.pos);
    if (node?.type.name === 'illustration') {
      editor.view.dispatch(editor.state.tr.setNodeMarkup(selected.pos, undefined, { ...node.attrs, caption: caption || null }));
    }
  }

  removeIllustration(): void {
    const selected = this.selectedIllustration();
    const editor = this.editor;
    const node = selected && editor ? editor.state.doc.nodeAt(selected.pos) : null;
    if (editor && selected && node?.type.name === 'illustration') {
      editor.view.dispatch(editor.state.tr.delete(selected.pos, selected.pos + node.nodeSize));
      this.selectedIllustration.set(null);
    }
  }

  private updateSelectedIllustration(): void {
    const selection = this.editor?.state.selection;
    if (selection instanceof NodeSelection && selection.node.type.name === 'illustration') {
      this.selectedIllustration.set({ pos: selection.from, caption: selection.node.attrs['caption'] as string | null });
    } else if (this.selectedIllustration()) {
      this.selectedIllustration.set(null);
    }
  }

  /** Endereço das imagens da biblioteca, para desenhar as ilustrações do capítulo. */
  private async loadImageUrls(universeId: string): Promise<void> {
    try {
      for (const image of await firstValueFrom(this.universeApi.listImages(universeId))) {
        this.imageUrls.set(image.id, image.url);
      }
      window.dispatchEvent(new Event(ILLUSTRATIONS_LOADED));
    } catch {
      // sem a lista, a ilustração mostra só a legenda
    }
  }

  openNotesPanel(): void {
    this.notesPanel()?.open();
  }

  /** Nota no trecho selecionado. Sem seleção, pede para selecionar (nota sempre fala de um trecho). */
  addNote(): void {
    const editor = this.editor;
    if (!editor) {
      return;
    }
    const { from, to, empty } = editor.state.selection;
    if (empty) {
      this.toast.add({ severity: 'info', summary: 'Selecione o trecho da nota primeiro', life: 3000 });
      return;
    }
    this.notesPanel()?.startNew(from, to, editor.state.doc.textBetween(from, to, ' '));
  }

  insertSceneBreak(): void {
    this.editor?.chain().focus().insertSceneBreak().run();
  }

  undo(): void {
    this.editor?.chain().focus().undo().run();
  }

  redo(): void {
    this.editor?.chain().focus().redo().run();
  }

  // ===== Título, navegação e salvamento =====

  async saveTitle(): Promise<void> {
    const title = this.title().trim();
    if (!title || title === this.savedTitle || !this.autosave) {
      this.title.set(this.savedTitle);
      return;
    }
    try {
      await this.autosave.rename(title);
      this.savedTitle = title;
    } catch (error) {
      this.title.set(this.savedTitle);
      this.autosave.errorMessage.set(problemMessage(error, 'Não foi possível renomear.'));
    }
  }

  async back(): Promise<void> {
    await this.autosave?.flush();
    const bookId = this.bookId();
    await this.router.navigate(bookId ? ['/books', bookId] : ['/books']);
  }

  retrySave(): void {
    void this.autosave?.flush();
  }

  toggleFocusMode(): void {
    this.focusMode.update((value) => !value);
  }

  // ===== Conflito =====

  async keepMine(): Promise<void> {
    this.resolving.set(true);
    try {
      await this.autosave?.keepMine();
      this.conflictServer.set(null);
    } finally {
      this.resolving.set(false);
    }
  }

  async useServer(): Promise<void> {
    this.resolving.set(true);
    try {
      const server = this.conflictServer() ?? (await firstValueFrom(this.api.getChapter(this.chapterId())));
      await this.autosave?.useServer(server);
      this.editor?.commands.setContent(server.content, { emitUpdate: false });
      this.conflictServer.set(null);
      this.updateWords();
    } finally {
      this.resolving.set(false);
    }
  }

  // ===== Ciclo de vida da página =====

  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.autosave?.hasUnsavedChanges()) {
      void this.autosave.flush();
      // O texto já está no aparelho, mas avisamos quem fecha a aba com algo ainda não enviado
      event.preventDefault();
    }
  }

  onVisibilityChange(): void {
    // No celular, trocar de app é o momento mais comum de perda de texto
    if (document.visibilityState === 'hidden') {
      void this.autosave?.flush();
    }
  }

  private updateWords(): void {
    this.words.set(countWords(this.editor?.getText({ blockSeparator: '\n' }) ?? ''));
    this.celebrateGoal();
  }

  /** Carrega quem pode ser mencionado e atualiza nomes de quem foi renomeado desde a última vez. */
  private async loadMentionTargets(): Promise<void> {
    const bookId = this.bookId();
    if (!bookId) {
      return;
    }
    try {
      const book = await firstValueFrom(this.api.getBook(bookId));
      const universeId = book.universeId;
      this.universeId.set(universeId);
      void this.loadImageUrls(universeId);
      const [characters, places, lore] = await Promise.all([
        firstValueFrom(this.universeApi.listCharacters(universeId)),
        firstValueFrom(this.universeApi.listPlaces(universeId)),
        firstValueFrom(this.universeApi.listLore(universeId)),
      ]);
      this.mentionTargets = [
        ...characters.map((c) => ({ id: c.id, kind: 'character' as const, label: c.name, hint: 'Personagem' })),
        ...places.map((p) => ({ id: p.id, kind: 'place' as const, label: p.name, hint: 'Lugar' })),
        ...lore.map((l) => ({ id: l.id, kind: 'lore' as const, label: l.name, hint: LORE_HINT[l.type] ?? 'Mundo' })),
      ];
      if (this.editor && refreshMentionLabels(this.editor, this.mentionTargets) > 0) {
        this.autosave?.markChanged();
      }
    } catch {
      // sem a lista, o "@" não sugere nada; o resto do editor segue normal
    }
  }

  private async loadWritingStats(): Promise<void> {
    try {
      const stats = await firstValueFrom(this.writing.stats());
      this.goalCelebrated = stats.goalReached; // já batida antes de abrir: não comemora de novo
      this.writingStats.set(stats);
    } catch {
      // sem a meta, o editor segue normal
    }
  }

  /** Uma vez por abertura do capítulo, no momento em que a meta do dia é batida. */
  private celebrateGoal(): void {
    const stats = this.writingStats();
    if (this.goalCelebrated || !stats?.goal || !this.goalReached()) {
      return;
    }
    this.goalCelebrated = true;
    const streak = streakAfterToday(stats, this.todayWords() ?? 0);
    this.toast.add({
      severity: 'success',
      summary: 'Meta do dia batida!',
      detail: streak > 1 ? `${streak} dias seguidos.` : 'Continue amanhã para começar uma sequência.',
      life: 5000,
    });
  }

  private updateToolbar(): void {
    const editor = this.editor;
    if (!editor) {
      return;
    }
    this.toolbar.set({
      bold: editor.isActive('bold'),
      italic: editor.isActive('italic'),
      underline: editor.isActive('underline'),
      heading: editor.isActive('heading'),
      blockquote: editor.isActive('blockquote'),
      indent: editor.isActive('paragraph', { indent: true }),
      proofreadOff: editor.isActive('proofreadOff'),
      canUndo: editor.can().undo(),
      canRedo: editor.can().redo(),
    });
  }
}
