import type { JSONContent } from '@tiptap/core';

/** Espelho dos DTOs da API v1 (booksmith/src/main/java/.../web). */

export type BookKind = 'ORIGINAL' | 'FANFIC';
export type BookStatus = 'DRAFT' | 'WRITING' | 'COMPLETE';
/** Tag BCP 47 do idioma do livro (orienta o corretor ortográfico do navegador). */
export type BookLanguage = 'pt-BR' | 'pt-PT' | 'en' | 'es';

export interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface BookSummary {
  id: string;
  title: string;
  synopsis: string | null;
  kind: BookKind;
  fandom: string | null;
  language: BookLanguage;
  coverUrl: string | null;
  status: BookStatus;
  /** Livros do mesmo universo compartilham personagens, lugares e linha do tempo. */
  universeId: string;
  chapterCount: number;
  wordCount: number;
  updatedAt: string;
}

export interface ChapterSummary {
  id: string;
  title: string;
  position: number;
  wordCount: number;
  version: number;
  updatedAt: string;
  /** Este capítulo abre uma parte do livro ("Parte I — A partida"); null = continua a anterior. */
  partTitle: string | null;
}

export interface BookDetail {
  id: string;
  title: string;
  synopsis: string | null;
  kind: BookKind;
  fandom: string | null;
  language: BookLanguage;
  coverUrl: string | null;
  status: BookStatus;
  /** Universo do livro: personagens e, depois, lugares, linha do tempo e regras. */
  universeId: string;
  createdAt: string;
  updatedAt: string;
  chapters: ChapterSummary[];
  /** Páginas antes e depois da história; null = a página não sai no livro. */
  pages: BookPages;
  /** Diagramação do PDF. */
  layout: BookLayout;
  /** Desenho da capa feita no editor; null = a capa não foi feita nele. */
  coverDesign: CoverDesign | null;
  /** Capa feita fora do app e importada em PDF; null = sem PDF. */
  coverPdf: CoverPdf | null;
}

/** Capa importada em PDF: só a frente (página em pé) ou a capa aberta (deitada). */
export interface CoverPdf {
  url: string;
  kind: 'front' | 'wrap';
  /** A página inteira (com as marcas de corte, se houver). */
  widthMm: number;
  heightMm: number;
  fileName: string;
  /** O tamanho do livro para o qual a capa foi feita (informado ou lido do PDF); null quando não se sabe. */
  trim?: string | null;
  /** A lombada medida (capa aberta). */
  spineMm?: number | null;
  bleedMm?: number | null;
  /** A margem das marcas de corte em volta da sangria (sai no PDF entregue). */
  marksMm?: number | null;
}

/** Escolhas da capa feita no editor (a imagem é desenhada no aparelho). */
export interface CoverDesign {
  template: 'classic' | 'band' | 'minimal';
  backgroundColor: string;
  /** Imagem da biblioteca do universo no fundo. */
  imageId: string | null;
  /** Quanto a imagem escurece, de 0 a 70. */
  shade: number;
  title: string;
  subtitle: string | null;
  author: string | null;
  font: 'serif' | 'sans';
  titleSize: 's' | 'm' | 'l';
  textColor: string;
  accentColor: string;
  /** Texto da contracapa (capa para gráfica); uma linha por parágrafo. */
  backText?: string | null;
}

export type PrintProfile = 'kdp-white' | 'kdp-cream' | 'kdp-color-premium' | 'custom';

/** Medidas da capa aberta para gráfica, em mm. */
export interface PrintCoverSpec {
  profile: PrintProfile;
  /** Páginas do miolo (o PDF diagramado, sem a página da capa). */
  pages: number;
  trimWidthMm: number;
  trimHeightMm: number;
  spineMm: number;
  bleedMm: number;
  widthMm: number;
  heightMm: number;
  /** Cabe texto na lombada. */
  spineText: boolean;
  warnings: string[];
  /** A capa importada em PDF, se houver, e (na capa aberta) se as medidas batem. */
  imported: 'front' | 'wrap' | null;
  importedWidthMm: number | null;
  importedHeightMm: number | null;
  importedFits: boolean | null;
  /** O tamanho do livro da capa importada, a lombada dela e a margem das marcas de corte, quando se sabe. */
  importedTrim: string | null;
  importedSpineMm: number | null;
  importedMarksMm: number | null;
}

/** Diagramação do PDF (as opções estão em book-layout). */
export interface BookLayout {
  trim: 'a5' | '14x21' | '16x23' | '6x9';
  fontSize: number;
  leading: 'compact' | 'normal' | 'airy';
  margins: 'narrow' | 'normal' | 'wide';
  chapterStyle: 'classic' | 'modern' | 'simple';
  sceneBreak: 'asterisks' | 'asterism' | 'diamond' | 'dots' | 'space';
}

/** Páginas do PDF como imagens (prévia), numeradas a partir de 1. */
export interface LayoutPreview {
  pageCount: number;
  pages: { number: number; image: string }[];
}

/** Créditos, dedicatória, epígrafe, agradecimentos e "sobre" (texto simples: cada linha, um parágrafo). */
export interface BookPages {
  credits: string | null;
  dedication: string | null;
  epigraph: string | null;
  epigraphSource: string | null;
  acknowledgments: string | null;
  aboutAuthor: string | null;
  /** Título da página "sobre"; null = o nome de quem escreveu. */
  aboutAuthorTitle: string | null;
}

export interface BookRequest {
  title: string;
  synopsis: string | null;
  kind: BookKind;
  fandom: string | null;
  status?: BookStatus;
  language?: BookLanguage;
  /** Data URL de uma imagem nova; omitir mantém a capa atual. */
  cover?: string | null;
  /** Só na criação: entrar num universo que já existe (série). Sem ele, o livro ganha um universo novo. */
  universeId?: string | null;
}

/** Universo do autor (§4.2 do produto): uma série inteira pode compartilhar um. */
export interface Universe {
  id: string;
  name: string;
  /** Começo da premissa, se o autor já escreveu uma no construtor. */
  premise: string | null;
  mapUrl: string | null;
  characterCount: number;
  placeCount: number;
  eventCount: number;
  magicCount: number;
  lawCount: number;
  createdAt: string;
}

/** Item de uma coleção do construtor (um sistema de magia, uma lei): id estável + valores dos campos. */
export type UniverseItem = { id: string } & AppearanceValues;

/** Conteúdo do construtor: campos simples e, nas coleções (`magic`, `laws`), listas de itens. */
export type UniverseDetails = Record<string, AppearanceValue | UniverseItem[]>;

/** Semente e ajustes do gerador de mapa (o mapa é refeito igual a partir deles). */
export interface MapGeneratorSettings {
  version: number;
  seed: string;
  size: 'small' | 'medium' | 'large';
  land: 'little' | 'medium' | 'much';
  countries: number;
  climate: 'cold' | 'temperate' | 'hot' | 'varied';
  style: 'atlas' | 'parchment';
}

export interface UniverseDetail {
  id: string;
  name: string;
  details: UniverseDetails;
  formVersion: number;
  mapUrl: string | null;
  /** Presente quando o mapa foi gerado no app. */
  mapGenerator: MapGeneratorSettings | null;
  version: number;
  characterCount: number;
  placeCount: number;
  eventCount: number;
  createdAt: string;
  updatedAt: string;
}

/** Um passo do construtor de universo (Ideia, Mundo, Mapa, Magia…). */
export interface UniverseStep extends AppearanceTab {
  /** Passo com uma lista de itens (sistemas de magia, leis). */
  collection?: string;
  /** Passo com a imagem do mapa. */
  map?: boolean;
}

export interface UniverseCollection {
  label: string;
  /** Texto do botão de criar ("Criar magia"). */
  add: string;
  /** Campo que dá nome ao item na lista. */
  titleField: string;
  max: number;
  fields: AppearanceField[];
}

export interface UniverseBuilderDefinition {
  id: string;
  version: number;
  tabs: UniverseStep[];
  collections: Record<string, UniverseCollection>;
}

/** Resultado de levar um livro para outro universo. */
export interface UniverseMove {
  universeId: string;
  /** O universo antigo (só deste livro) foi juntado ao novo, com tudo o que tinha. */
  merged: boolean;
  /** Personagens e lugares com o mesmo nome nos dois universos: o autor decide o que fazer. */
  duplicateNames: string[];
}

export interface Chapter {
  id: string;
  bookId: string;
  title: string;
  position: number;
  language: BookLanguage;
  content: JSONContent;
  wordCount: number;
  contentHash: string;
  version: number;
  updatedAt: string;
}

export type VersionReason = 'AUTOMATIC' | 'MANUAL' | 'BEFORE_RESTORE';

export interface ChapterVersionSummary {
  id: string;
  chapterVersion: number;
  reason: VersionReason;
  label: string | null;
  title: string | null;
  wordCount: number;
  createdAt: string;
}

export interface ChapterVersionDetail extends ChapterVersionSummary {
  content: JSONContent;
}

// ===== Biblioteca de imagens =====

export interface ImageLink {
  id: string;
  name: string;
  kind: 'character' | 'place' | 'lore';
}

export interface UniverseImage {
  id: string;
  universeId: string;
  url: string;
  contentType: string;
  bytes: number;
  caption: string | null;
  /** Personagens, lugares e fichas do mundo que aparecem na imagem. */
  entities: ImageLink[];
  version: number;
  createdAt: string;
}

export interface Portrait {
  entityId: string;
  imageId: string | null;
  url: string | null;
}

/** Item da lixeira do universo: personagem, lugar, ficha do mundo, evento, relação ou imagem. */
export interface UniverseTrashItem {
  type: 'CHARACTER' | 'PLACE' | 'LORE' | 'EVENT' | 'RELATION' | 'IMAGE';
  id: string;
  title: string;
  universeId: string;
  universeName: string | null;
  deletedAt: string;
  expiresAt: string;
}

export interface TrashItem {
  type: 'BOOK' | 'CHAPTER';
  id: string;
  title: string;
  bookId: string;
  bookTitle: string;
  wordCount: number | null;
  deletedAt: string;
  /** Quando o item será apagado de vez. */
  expiresAt: string;
}

/** Como um arquivo importado (.docx, .odt, .md, .txt) foi (ou seria) dividido em capítulos. */
export interface ImportPlan {
  splitRule: 'HEADINGS' | 'CHAPTER_TITLES' | 'SINGLE';
  /** Nome do livro no começo do arquivo (estilo "Título" do Word ou do LibreOffice, `#` único no Markdown). */
  documentTitle: string | null;
  totalWords: number;
  warnings: string[];
  chapters: ImportedChapter[];
}

export interface ImportedChapter {
  /** Preenchido só depois da importação. */
  id: string | null;
  title: string;
  wordCount: number;
  excerpt: string;
}

export type ImportMode = 'auto' | 'single';

/** Sessão aberta em um aparelho (§20.6). */
export interface DeviceSession {
  id: string;
  /** Nome legível, ex.: "Chrome no Android". */
  device: string;
  createdAt: string | null;
  /** Atualizado no login e a cada renovação do token (cerca de 1 hora). */
  lastActiveAt: string | null;
  current: boolean;
}

export interface SaveResult {
  version: number;
  wordCount: number;
  contentHash: string;
  updatedAt: string;
}

export interface UserSummary {
  id: string;
  username: string;
  displayName: string;
  emailVerified: boolean;
}

export interface SessionResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: UserSummary;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string | null;
  email: string;
  password: string;
  birthDate: string;
}

export interface AuthorProfile {
  penName: string;
  bio: string;
  avatarUrl: string | null;
  audience: string;
  language: string;
  socialLinks: string[];
  bookGenres: string[];
  writingStyles: string[];
  authorReferences: string[];
}

export interface AuthorProfileRequest extends Omit<AuthorProfile, 'avatarUrl'> {
  /** Data URL de um avatar novo; omitir mantém o atual. */
  avatar?: string | null;
}

export interface Profile {
  user: {
    id: string;
    username: string;
    firstName: string | null;
    lastName: string | null;
    displayName: string;
    email: string;
    emailVerified: boolean;
    birthDate: string | null;
  };
  author: AuthorProfile | null;
}

/** Erro RFC 9457 devolvido pela API. */
export interface ProblemDetail {
  status: number;
  title?: string;
  detail?: string;
  code?: string;
  errors?: { field: string; message: string }[];
  currentVersion?: number;
}

// ===== Bíblia do Universo =====

export type CharacterRole = 'protagonist' | 'antagonist' | 'supporting' | 'minor';

/** Ficha do personagem (§4.3 do produto). Todos os campos são opcionais. */
export interface CharacterSheet {
  role?: CharacterRole;
  age?: string;
  birthday?: string;
  occupation?: string;
  personality?: string;
  voice?: string;
  fears?: string;
  desires?: string;
  secrets?: string;
  backstory?: string;
  notes?: string;
}

/** Valores do formulário de aparência: texto (opção ou livre), lista ou número. */
export type AppearanceValue = string | string[] | number;
export type AppearanceValues = Record<string, AppearanceValue>;

export interface CharacterSummary {
  id: string;
  name: string;
  aliases: string[];
  role: CharacterRole | null;
  /** Ex.: "Olhos verdes, cabelo ruivo, cacheado". */
  appearanceSummary: string;
  /** Retrato escolhido na biblioteca de imagens. */
  portraitUrl: string | null;
  updatedAt: string;
}

export interface Character {
  id: string;
  universeId: string;
  name: string;
  aliases: string[];
  sheet: CharacterSheet;
  appearance: AppearanceValues;
  appearanceFormVersion: number;
  appearanceSummary: string;
  portraitId: string | null;
  portraitUrl: string | null;
  /** Valores dos campos próprios do autor (chaves de {@link CustomFieldDefinition}). */
  custom: AppearanceValues;
  version: number;
  updatedAt: string;
}

export interface CharacterUpdate {
  version: number;
  name: string;
  aliases: string[];
  sheet: CharacterSheet;
  appearance: AppearanceValues;
  custom?: AppearanceValues;
}

/**
 * Campos próprios do autor, por tipo de ficha: "character", "place" e cada tipo do mundo ("creature"...). Mesmo
 * formato dos formulários da API; chaves e valores das opções são gerados pelo servidor.
 */
export type CustomFieldDefinition = Partial<Record<string, AppearanceField[]>>;

/** Campo em edição na tela de campos próprios: sem chave ainda, se é novo. */
export interface CustomFieldDraft {
  key?: string;
  label: string;
  type: 'text' | 'longtext' | 'choice' | 'multi' | 'scale';
  options?: { value?: string; label: string }[];
  allowCustom?: boolean;
  poles?: [string, string];
}

/** Definição do formulário de aparência, servida pela API (§12.1): o app monta a tela a partir dela. */
export interface AppearanceFormDefinition {
  id: string;
  version: number;
  tabs: AppearanceTab[];
}

/** Seção do montador de personagem a que a aba pertence. */
export type AppearanceGroup = 'appearance' | 'personality';

export interface AppearanceTab {
  key: string;
  label: string;
  group?: AppearanceGroup;
  /** Explicação curta mostrada no alto da aba. */
  help?: string;
  fields: AppearanceField[];
}

export type AppearanceFieldType = 'choice' | 'multi' | 'color' | 'scale' | 'text' | 'longtext';

export interface AppearanceField {
  key: string;
  label: string;
  type: AppearanceFieldType;
  options?: AppearanceOption[];
  allowCustom?: boolean;
  min?: number;
  max?: number;
  /** Rótulos da escala, do mínimo ao máximo. */
  labels?: string[];
  /** Escala de temperamento: os dois polos, mostrados nas pontas do controle ("Introvertido", "Extrovertido"). */
  poles?: [string, string];
  placeholder?: string;
  help?: string;
}

export interface AppearanceOption {
  value: string;
  label: string;
  hex?: string;
}

export type PlaceType =
  | 'city' | 'town' | 'neighborhood' | 'building' | 'home' | 'school' | 'workplace' | 'shop' | 'nature'
  | 'water' | 'mountain' | 'realm' | 'region' | 'planet' | 'vehicle' | 'other';

/** Ficha do lugar (§4.2 do produto). {@code parentId}: o lugar que contém este ("dentro de"). */
export interface PlaceSheet {
  type?: PlaceType;
  parentId?: string;
  location?: string;
  description?: string;
  atmosphere?: string;
  rules?: string;
  history?: string;
  notes?: string;
}

export interface PlaceSummary {
  id: string;
  name: string;
  aliases: string[];
  type: PlaceType | null;
  parentId: string | null;
  parentName: string | null;
  excerpt: string | null;
  /** Posição no mapa do universo (0 a 1), para lugares criados a partir do mapa gerado. */
  mapX: number | null;
  mapY: number | null;
  portraitUrl: string | null;
  updatedAt: string;
}

export interface Place {
  id: string;
  universeId: string;
  name: string;
  aliases: string[];
  sheet: PlaceSheet;
  mapX: number | null;
  mapY: number | null;
  portraitId: string | null;
  portraitUrl: string | null;
  custom: AppearanceValues;
  version: number;
  updatedAt: string;
}

/** Um lugar do mapa gerado, para criar em lote. `key` e `parentKey` ligam os itens do mesmo lote. */
export interface MapPlace {
  key: string;
  name: string;
  type: PlaceType;
  parentKey: string | null;
  x: number;
  y: number;
  description: string | null;
  atmosphere: string | null;
}

export interface MapImport {
  created: number;
  /** Nomes que já existiam no universo e não foram criados de novo. */
  skipped: string[];
}

/** Contexto do mundo: religião, sistema político, idioma ou organização. */
export type LoreType = 'religion' | 'government' | 'language' | 'organization' | 'creature' | 'object' | 'term';

export interface LoreTypeDefinition {
  label: string;
  plural: string;
  /** Ícone PrimeIcons, sem o prefixo "pi " ("pi-sun"). */
  icon: string;
  /** Texto do botão de criar ("Criar religião"). */
  add: string;
  help: string;
  summaryField: string;
  fields: AppearanceField[];
}

/** Fichas do contexto do mundo, servidas pela API (`GET /forms/lore`). */
export interface LoreDefinition {
  id: string;
  version: number;
  types: Record<LoreType, LoreTypeDefinition>;
}

export interface PlaceRef {
  id: string;
  name: string;
}

export interface LoreSummary {
  id: string;
  type: LoreType;
  name: string;
  aliases: string[];
  summary: string | null;
  places: PlaceRef[];
  updatedAt: string;
}

export interface Lore {
  id: string;
  universeId: string;
  type: LoreType;
  name: string;
  aliases: string[];
  values: AppearanceValues;
  places: PlaceRef[];
  custom: AppearanceValues;
  version: number;
  updatedAt: string;
}

export interface LoreUpdate {
  version: number;
  name: string;
  aliases: string[];
  values: AppearanceValues;
  placeIds: string[];
  custom?: AppearanceValues;
}

/** Item do mundo gerado com o mapa; os lugares vão pelo nome. */
export interface LoreDraft {
  type: LoreType;
  name: string;
  values: AppearanceValues;
  placeNames: string[];
}

export interface LoreImport {
  created: number;
  skipped: string[];
}

export interface PlaceUpdate {
  version: number;
  name: string;
  aliases: string[];
  sheet: PlaceSheet;
  custom?: AppearanceValues;
}

// ===== Linha do tempo =====

export interface EntityRef {
  id: string;
  name: string;
}

export interface TimelineEvent {
  id: string;
  universeId: string;
  title: string;
  /** "Verão de 1999", "Três dias depois". */
  whenLabel: string | null;
  description: string | null;
  chapterId: string | null;
  place: EntityRef | null;
  characters: EntityRef[];
  kind: EventKind | null;
  /** Data no calendário do mundo; nula quando só há o "quando" em texto. */
  date: WorldDate | null;
  /** "12 de Brumal de 312 E.C.", calculado pela API com o calendário do universo. */
  dateLabel: string | null;
  /** Idade de cada personagem do evento, a partir do nascimento dele na linha do tempo. */
  ages: { id: string; name: string; years: number }[];
  /** Fichas do mundo envolvidas (religiões, governos, organizações, objetos…). */
  lore: EntityRef[];
  version: number;
  updatedAt: string;
}

export type EventKind =
  | 'birth'
  | 'death'
  | 'war'
  | 'battle'
  | 'founding'
  | 'coronation'
  | 'treaty'
  | 'catastrophe'
  | 'discovery'
  | 'journey'
  | 'wedding';

export interface TimelineEventUpdate {
  version: number;
  title: string;
  whenLabel: string | null;
  description: string | null;
  chapterId: string | null;
  placeId: string | null;
  characterIds: string[];
  kind: EventKind | null;
  date: WorldDate | null;
  loreIds: string[];
}

/** Data no calendário do mundo: ano obrigatório; mês e dia, opcionais. */
export interface WorldDate {
  era: string;
  year: number;
  month?: number | null;
  day?: number | null;
}

export interface CalendarEra {
  key: string;
  name: string;
  abbreviation: string;
  /** Duração em anos; nula só na última era (a atual). */
  years: number | null;
}

/** Calendário do mundo (§4.2 do produto). Sem um definido, a API devolve o nosso. */
export interface WorldCalendar {
  eras: CalendarEra[];
  months: { name: string; days: number }[];
  weekdays: string[];
}

// ===== Relações entre personagens =====

export type RelationKind =
  | 'parent'
  | 'sibling'
  | 'spouse'
  | 'romance'
  | 'friend'
  | 'mentor'
  | 'rival'
  | 'enemy'
  | 'ally'
  | 'serves'
  | 'other';

export interface Relation {
  id: string;
  universeId: string;
  from: EntityRef;
  to: EntityRef;
  kind: RelationKind;
  /** O tipo lê de `from` para `to` ("é mãe de"); senão vale para os dois lados. */
  directed: boolean;
  description: string | null;
  /** Eventos da linha do tempo em que a relação começa e termina. */
  since: EntityRef | null;
  until: EntityRef | null;
  version: number;
  updatedAt: string;
}

export interface RelationRequest {
  fromId: string;
  toId: string;
  kind: RelationKind;
  description: string | null;
  sinceEventId: string | null;
  untilEventId: string | null;
}

export interface UpdateRelationRequest extends RelationRequest {
  version: number;
}

// ===== Continuidade =====

export type AlertStatus = 'open' | 'fixed' | 'ignored' | 'intentional';

export interface AlertEvidence {
  chapterId: string;
  chapterTitle: string;
  blockId: string | null;
  quote: string;
  /** Parte da citação a destacar ("azuis", "Kaell"). */
  highlight: string;
}

export interface ContinuityAlert {
  id: string;
  type: 'attribute' | 'naming';
  severity: 'low' | 'medium' | 'high';
  confidence: number;
  message: string;
  evidence: AlertEvidence[];
  status: AlertStatus;
  createdAt: string;
}

export interface ContinuityOverview {
  lastAnalysis: { analyzedAt: string; chapters: number; entities: number } | null;
  alerts: ContinuityAlert[];
  /** O que a análise atual verifica, para a tela explicar. */
  checks: string[];
  /** Só na resposta de uma análise. */
  created: number | null;
  fixed: number | null;
}

// ===== Suporte =====

export type SupportCategory =
  | 'lost_text'
  | 'account'
  | 'import_export'
  | 'universe'
  | 'bug'
  | 'suggestion'
  | 'privacy'
  | 'other';

/** Contexto técnico do pedido. Nunca o texto do livro. */
export interface SupportContext {
  route: string | null;
  appVersion: string;
  userAgent: string;
  online: boolean;
  screen: string;
  language: string;
  traceIds: string[];
  chapterId: string | null;
  autosaveStatus: string | null;
}

export interface SupportRequest {
  id: string;
  /** Número curto para citar ("BS-3F9A2C71"). */
  protocol: string;
  category: SupportCategory;
  message: string;
  priority: 'high' | 'normal';
  status: 'open' | 'answered' | 'closed';
  /** Para onde vai a resposta. */
  email: string;
  createdAt: string;
}

// ===== Meta diária =====

export interface WritingDay {
  /** "2026-11-10". */
  day: string;
  words: number;
}

export interface WritingStats {
  /** Saldo de palavras de hoje (no fuso do aparelho). */
  today: number;
  /** Meta diária; null sem meta. */
  goal: number | null;
  /** Dias seguidos com a meta batida (sem meta, com qualquer escrita). Continua viva até o fim de hoje. */
  streak: number;
  goalReached: boolean;
  /** Últimos 30 dias, do mais antigo a hoje. */
  history: WritingDay[];
}

// ===== Menções (@) =====

/** Um capítulo que menciona um personagem, lugar ou ficha do mundo. */
export interface MentionedIn {
  bookId: string;
  bookTitle: string;
  chapterId: string;
  chapterTitle: string | null;
  position: number;
  /** Quantas vezes o capítulo menciona. */
  count: number;
}

// ===== Notas do autor =====

export interface ChapterNote {
  /** Também é o threadId da marca no trecho. */
  id: string;
  chapterId: string;
  body: string;
  /** O trecho quando a nota foi criada (o atual vem do texto). */
  quote: string | null;
  resolved: boolean;
  createdAt: string;
  updatedAt: string;
}

// ===== Corretor =====

export interface ProofreadIssue {
  /** Posição no texto do parágrafo (com a menção valendo o nome). */
  offset: number;
  length: number;
  /** spelling (ortografia), grammar (gramática) ou style (estilo). */
  type: 'spelling' | 'grammar' | 'style';
  message: string;
  shortMessage: string;
  /** Até 5 sugestões. */
  replacements: string[];
  ruleId: string;
}

export interface ProofreadBlock {
  id: string;
  issues: ProofreadIssue[];
}

// ===== Sugestões de IA (§4.11) =====

export type SuggestionKind = 'universe' | 'character' | 'plot';
export type SuggestionMode = 'ideas' | 'questions';
export type PlotField = 'next' | 'conflict' | 'twist' | 'subplot' | 'ending';

/** Se a IA está ligada, qual e quanto ainda dá para pedir hoje. `local`: o texto não sai do computador. */
export interface AssistStatus {
  enabled: boolean;
  provider: string;
  model: string;
  local: boolean;
  dailyLimit: number;
  remaining: number;
}

/** Uma linha do que está na tela, mandada como contexto ("Personalidade: curiosa"). */
export interface ContextLine {
  label: string;
  text: string;
}

export interface SuggestionRequest {
  kind: SuggestionKind;
  mode?: SuggestionMode;
  universeId?: string | null;
  bookId?: string | null;
  field: string;
  fieldLabel?: string;
  /** O que o campo pede, como a tela explica. */
  fieldHelp?: string;
  /** Personagem da ficha aberta: as relações dele vêm primeiro no contexto. */
  characterId?: string | null;
  current?: string;
  context?: ContextLine[];
  hint?: string;
}

export interface Suggestion {
  title: string;
  text: string;
}

export interface SuggestionResult {
  suggestions: Suggestion[];
  provider: string;
  model: string;
  local: boolean;
  remaining: number;
}

// ===== Revisão do capítulo pela IA (§4.11) =====

/** `proofread` é do app: o corretor sem IA do editor (LanguageTool), sem passar pela revisão do servidor. */
export type ReviewCheck = 'format' | 'proofread' | 'spelling' | 'style' | 'holes' | 'continuity' | 'improvements';

export interface ReviewRequest {
  bookId: string;
  chapterId: string;
  check: ReviewCheck;
  /** Onde começa a parte pedida (`nextBlock` da resposta anterior); vazio = a primeira. */
  fromBlock?: string | null;
  /** A revisão com IA aberta (`startReview`); a formatação não precisa. */
  runId?: string | null;
}

/** Abrir a revisão com IA gasta um uso da cota; as chamadas seguintes levam o `runId`. */
export interface ReviewStart {
  runId: string;
  remaining: number;
}

/** Um apontamento: o trecho (se houver), o problema e a sugestão. */
export interface ReviewItem {
  blockId: string | null;
  quote: string | null;
  problem: string;
  suggestion: string;
  /** A sugestão substitui o trecho direto: o app oferece "Corrigir". */
  fix: boolean;
  /** A regra da formatação (dialogue, capital, honorific, tag); vazio nas revisões da IA. */
  kind?: string | null;
}

export interface ReviewResult {
  findings: ReviewItem[];
  nextBlock: string | null;
  part: number;
  parts: number;
  remaining: number;
  provider: string;
  model: string;
  local: boolean;
}

/** "Pergunte ao seu livro" (§4.5). */
export interface AskRequest {
  bookId: string;
  question: string;
}

/** Um trecho do livro que sustenta a resposta, já conferido no texto: abre o editor no parágrafo. */
export interface AskCitation {
  chapterId: string;
  chapter: number;
  chapterTitle: string | null;
  blockId: string;
  quote: string;
}

export interface AskResult {
  answer: string;
  citations: AskCitation[];
  provider: string;
  model: string;
  local: boolean;
  remaining: number;
}

/** Revisão dos textos do livro (sinopse, "sobre o autor", fichas) contra a história. */
export interface BookTextItem {
  /** synopsis, about ou character. */
  source: 'synopsis' | 'about' | 'character';
  /** A ficha, quando é de personagem. */
  id: string | null;
  /** "Sinopse", "Ficha de Lia · Medos". */
  label: string;
  quote: string;
  context: string;
  problem: string;
  suggestion: string;
  /** spelling, grammar, format, name (sem IA) ou fact (IA). */
  kind: string;
  /** O texto onde está (synopsis, about, c:<ficha>:<campo>), para corrigir. */
  key: string;
  /** Onde o trecho começa no texto. */
  offset: number;
  /** A sugestão pode substituir o trecho ("Corrigir"); os fatos da IA só apontam. */
  fix: boolean;
  /** Vale para todas as ocorrências no texto (nomes). */
  all: boolean;
}

/** Uma correção marcada: o servidor confere o trecho no texto atual antes de trocar. */
export interface BookTextFix {
  key: string;
  offset: number;
  quote: string;
  suggestion: string;
  all: boolean;
}

export interface BookTextsApplied {
  applied: number;
  /** Trechos que já tinham mudado. */
  skipped: number;
}

export interface BookTextsResult {
  items: BookTextItem[];
  texts: number;
  provider: string;
  model: string;
  local: boolean;
  remaining: number;
}
