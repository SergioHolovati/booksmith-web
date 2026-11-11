import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, shareReplay, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  AppearanceFormDefinition,
  Character,
  CharacterSummary,
  CharacterUpdate,
  Place,
  PlaceSummary,
  PlaceUpdate,
  TimelineEvent,
  TimelineEventUpdate,
  LoreDefinition,
  LoreDraft,
  LoreImport,
  Lore,
  LoreSummary,
  LoreType,
  LoreUpdate,
  MapGeneratorSettings,
  MapImport,
  MapPlace,
  Universe,
  UniverseBuilderDefinition,
  WorldCalendar,
  UniverseTrashItem,
  UniverseImage,
  Portrait,
  Relation,
  RelationRequest,
  UpdateRelationRequest,
  UniverseDetail,
  UniverseDetails,
} from '../models/api.models';

/** Bíblia do Universo: universos, personagens, lugares, linha do tempo e a definição do montador. */
@Injectable({ providedIn: 'root' })
export class UniverseApi {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  listUniverses(): Observable<Universe[]> {
    return this.http.get<Universe[]>(`${this.base}/universes`);
  }

  renameUniverse(id: string, name: string): Observable<Universe> {
    return this.http.put<Universe>(`${this.base}/universes/${id}`, { name });
  }

  /** Universo sem livro ainda: para quem cria o mundo antes da história. */
  createUniverse(name: string): Observable<UniverseDetail> {
    return this.http.post<UniverseDetail>(`${this.base}/universes`, { name });
  }

  getUniverse(id: string): Observable<UniverseDetail> {
    return this.http.get<UniverseDetail>(`${this.base}/universes/${id}`);
  }

  saveUniverse(id: string, update: { version: number; name: string; details: UniverseDetails }): Observable<UniverseDetail> {
    return this.http.put<UniverseDetail>(`${this.base}/universes/${id}/details`, update);
  }

  /** `generator`: semente e ajustes, quando o mapa foi gerado no app. */
  setUniverseMap(id: string, image: string, generator: MapGeneratorSettings | null = null): Observable<UniverseDetail> {
    return this.http.put<UniverseDetail>(`${this.base}/universes/${id}/map`, { image, generator });
  }

  removeUniverseMap(id: string): Observable<UniverseDetail> {
    return this.http.delete<UniverseDetail>(`${this.base}/universes/${id}/map`);
  }

  private builder$?: Observable<UniverseBuilderDefinition>;

  /** Definição do construtor de universo; como a do montador, muda só com deploy da API. */
  universeBuilderForm(): Observable<UniverseBuilderDefinition> {
    this.builder$ ??= this.http.get<UniverseBuilderDefinition>(`${this.base}/forms/universe-builder`).pipe(
      shareReplay({ bufferSize: 1, refCount: false }),
      catchError((error: unknown) => {
        this.builder$ = undefined;
        return throwError(() => error);
      }),
    );
    return this.builder$;
  }

  /** A definição muda só com deploy da API: uma busca por sessão do app basta. Erros não ficam no cache. */
  private form$?: Observable<AppearanceFormDefinition>;

  appearanceForm(): Observable<AppearanceFormDefinition> {
    this.form$ ??= this.http.get<AppearanceFormDefinition>(`${this.base}/forms/character-appearance`).pipe(
      shareReplay({ bufferSize: 1, refCount: false }),
      catchError((error: unknown) => {
        this.form$ = undefined;
        return throwError(() => error);
      }),
    );
    return this.form$;
  }

  listCharacters(universeId: string): Observable<CharacterSummary[]> {
    return this.http.get<CharacterSummary[]>(`${this.base}/universes/${universeId}/characters`);
  }

  createCharacter(universeId: string, name: string): Observable<Character> {
    return this.http.post<Character>(`${this.base}/universes/${universeId}/characters`, { name });
  }

  getCharacter(id: string): Observable<Character> {
    return this.http.get<Character>(`${this.base}/characters/${id}`);
  }

  updateCharacter(id: string, update: CharacterUpdate): Observable<Character> {
    return this.http.put<Character>(`${this.base}/characters/${id}`, update);
  }

  deleteCharacter(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/characters/${id}`);
  }

  listPlaces(universeId: string): Observable<PlaceSummary[]> {
    return this.http.get<PlaceSummary[]>(`${this.base}/universes/${universeId}/places`);
  }

  createPlace(universeId: string, name: string): Observable<Place> {
    return this.http.post<Place>(`${this.base}/universes/${universeId}/places`, { name });
  }

  /** Cria de uma vez os lugares do mapa gerado (países, cidades, florestas…), com posição no mapa. */
  importMapPlaces(universeId: string, places: MapPlace[]): Observable<MapImport> {
    return this.http.post<MapImport>(`${this.base}/universes/${universeId}/places/from-map`, { places });
  }

  // ===== Contexto do mundo (religiões, governos, idiomas, organizações, criaturas, objetos, termos) =====

  private lore$?: Observable<LoreDefinition>;

  /** Definição das fichas do mundo; muda só com deploy da API. */
  loreForm(): Observable<LoreDefinition> {
    this.lore$ ??= this.http.get<LoreDefinition>(`${this.base}/forms/lore`).pipe(
      shareReplay({ bufferSize: 1, refCount: false }),
      catchError((error: unknown) => {
        this.lore$ = undefined;
        return throwError(() => error);
      }),
    );
    return this.lore$;
  }

  listLore(universeId: string, type?: LoreType): Observable<LoreSummary[]> {
    return this.http.get<LoreSummary[]>(`${this.base}/universes/${universeId}/lore`, {
      params: type ? { type } : {},
    });
  }

  createLore(universeId: string, type: LoreType, name: string): Observable<Lore> {
    return this.http.post<Lore>(`${this.base}/universes/${universeId}/lore`, { type, name });
  }

  importLore(universeId: string, items: LoreDraft[]): Observable<LoreImport> {
    return this.http.post<LoreImport>(`${this.base}/universes/${universeId}/lore/batch`, { items });
  }

  getLore(id: string): Observable<Lore> {
    return this.http.get<Lore>(`${this.base}/lore/${id}`);
  }

  updateLore(id: string, update: LoreUpdate): Observable<Lore> {
    return this.http.put<Lore>(`${this.base}/lore/${id}`, update);
  }

  deleteLore(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/lore/${id}`);
  }

  /** O que existe num lugar: religião, governo, idiomas, organizações. */
  loreAtPlace(placeId: string): Observable<LoreSummary[]> {
    return this.http.get<LoreSummary[]>(`${this.base}/places/${placeId}/lore`);
  }

  getPlace(id: string): Observable<Place> {
    return this.http.get<Place>(`${this.base}/places/${id}`);
  }

  updatePlace(id: string, update: PlaceUpdate): Observable<Place> {
    return this.http.put<Place>(`${this.base}/places/${id}`, update);
  }

  deletePlace(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/places/${id}`);
  }

  timeline(universeId: string): Observable<TimelineEvent[]> {
    return this.http.get<TimelineEvent[]>(`${this.base}/universes/${universeId}/timeline`);
  }

  /** Cria logo depois de {@code afterId}; sem ele, no fim. */
  createEvent(universeId: string, title: string, afterId: string | null = null): Observable<TimelineEvent> {
    return this.http.post<TimelineEvent>(`${this.base}/universes/${universeId}/timeline`, { title, afterId });
  }

  updateEvent(id: string, update: TimelineEventUpdate): Observable<TimelineEvent> {
    return this.http.put<TimelineEvent>(`${this.base}/timeline/${id}`, update);
  }

  /** Move para logo depois de {@code afterId}; nulo leva para o começo. */
  moveEvent(id: string, afterId: string | null): Observable<TimelineEvent> {
    return this.http.post<TimelineEvent>(`${this.base}/timeline/${id}/move`, { afterId });
  }

  /** Põe os eventos datados em ordem cronológica; os sem data ficam onde estavam. */
  sortTimelineByDate(universeId: string): Observable<TimelineEvent[]> {
    return this.http.post<TimelineEvent[]>(`${this.base}/universes/${universeId}/timeline/sort-by-date`, {});
  }

  calendar(universeId: string): Observable<WorldCalendar> {
    return this.http.get<WorldCalendar>(`${this.base}/universes/${universeId}/calendar`);
  }

  saveCalendar(universeId: string, calendar: WorldCalendar): Observable<WorldCalendar> {
    return this.http.put<WorldCalendar>(`${this.base}/universes/${universeId}/calendar`, calendar);
  }

  /** Personagens, lugares, fichas do mundo, eventos e relações excluídos nos últimos 30 dias. */
  listUniverseTrash(): Observable<UniverseTrashItem[]> {
    return this.http.get<UniverseTrashItem[]>(`${this.base}/me/trash/universe`);
  }

  restoreUniverseItem(item: Pick<UniverseTrashItem, 'type' | 'id'>): Observable<UniverseTrashItem> {
    return this.http.post<UniverseTrashItem>(
      `${this.base}/me/trash/universe/${item.type.toLowerCase()}/${item.id}/restore`,
      {},
    );
  }

  /** Imagens do universo, mais novas primeiro; com `entityId`, só as ligadas a ele. */
  listImages(universeId: string, entityId?: string): Observable<UniverseImage[]> {
    const params = entityId ? { entityId } : undefined;
    return this.http.get<UniverseImage[]>(`${this.base}/universes/${universeId}/images`, { params });
  }

  uploadImage(universeId: string, dataUrl: string, caption: string | null, entityIds: string[]): Observable<UniverseImage> {
    return this.http.post<UniverseImage>(`${this.base}/universes/${universeId}/images`, { dataUrl, caption, entityIds });
  }

  updateImage(id: string, update: { version: number; caption: string | null; entityIds: string[] }): Observable<UniverseImage> {
    return this.http.put<UniverseImage>(`${this.base}/images/${id}`, update);
  }

  deleteImage(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/images/${id}`);
  }

  /** Retrato de um personagem ou lugar; `imageId` null tira o retrato. */
  setPortrait(entityId: string, imageId: string | null): Observable<Portrait> {
    return this.http.put<Portrait>(`${this.base}/entities/${entityId}/portrait`, { imageId });
  }

  listRelations(universeId: string): Observable<Relation[]> {
    return this.http.get<Relation[]>(`${this.base}/universes/${universeId}/relations`);
  }

  createRelation(universeId: string, request: RelationRequest): Observable<Relation> {
    return this.http.post<Relation>(`${this.base}/universes/${universeId}/relations`, request);
  }

  updateRelation(id: string, request: UpdateRelationRequest): Observable<Relation> {
    return this.http.put<Relation>(`${this.base}/relations/${id}`, request);
  }

  deleteRelation(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/relations/${id}`);
  }

  deleteEvent(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/timeline/${id}`);
  }
}
