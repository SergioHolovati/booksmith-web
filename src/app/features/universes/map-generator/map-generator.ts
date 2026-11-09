import { Component, ElementRef, computed, inject, input, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SelectButtonModule } from 'primeng/selectbutton';
import { firstValueFrom } from 'rxjs';

import { problemMessage } from '../../../core/api/problem';
import { UniverseApi } from '../../../core/api/universe.api';
import { UniverseDetail } from '../../../core/models/api.models';
import { newSeed } from './random';
import { renderWorld } from './render';
import { GENERATOR_VERSION, MapSettings, World, defaultSettings, generateWorld } from './world';

const MAX_COUNTRIES = 8;

/**
 * Gerador de continente (sem IA): ajustes de tamanho, terra, países, clima e estilo; "Gerar outro" sorteia uma
 * semente nova. O mapa sai igual para a mesma semente. "Usar este mapa" salva a imagem e os ajustes no universo.
 */
@Component({
  selector: 'app-map-generator',
  imports: [
    RouterLink,
    FormsModule,
    ButtonModule,
    ConfirmDialogModule,
    InputTextModule,
    ProgressSpinnerModule,
    SelectButtonModule,
  ],
  providers: [ConfirmationService],
  templateUrl: './map-generator.html',
  styleUrl: './map-generator.scss',
})
export class MapGeneratorComponent {
  private readonly api = inject(UniverseApi);
  private readonly router = inject(Router);
  private readonly toast = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);
  private readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>('map');

  readonly universeId = input.required<string>();

  readonly universe = signal<UniverseDetail | null>(null);
  readonly settings = signal<MapSettings>(defaultSettings(newSeed()));
  readonly world = signal<World | null>(null);
  readonly generating = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly maxCountries = MAX_COUNTRIES;

  readonly sizes = [
    { label: 'Pequeno', value: 'small' },
    { label: 'Médio', value: 'medium' },
    { label: 'Grande', value: 'large' },
  ];
  readonly lands = [
    { label: 'Pouca terra', value: 'little' },
    { label: 'Meio a meio', value: 'medium' },
    { label: 'Muita terra', value: 'much' },
  ];
  readonly climates = [
    { label: 'Variado', value: 'varied' },
    { label: 'Frio', value: 'cold' },
    { label: 'Temperado', value: 'temperate' },
    { label: 'Quente', value: 'hot' },
  ];
  readonly styles = [
    { label: 'Atlas', value: 'atlas' },
    { label: 'Pergaminho', value: 'parchment' },
  ];

  /** Resumo do que o mapa tem, por país. */
  readonly summary = computed(() => {
    const world = this.world();
    if (!world) {
      return [];
    }
    return world.countries.map((c) => ({
      name: c.name,
      color: c.color,
      capital: world.settlements.find((s) => s.kind === 'capital' && s.country === c.id)?.name ?? '',
      places: world.settlements.filter((s) => s.country === c.id).length,
    }));
  });
  readonly features = computed(() => this.world()?.features.map((f) => f.name) ?? []);

  constructor() {
    queueMicrotask(() => void this.load());
  }

  private async load(): Promise<void> {
    try {
      const universe = await firstValueFrom(this.api.getUniverse(this.universeId()));
      this.universe.set(universe);
      // Volta ao mapa salvo, se ele foi gerado aqui com a mesma versão do gerador
      const saved = universe.mapGenerator;
      if (saved && saved.version === GENERATOR_VERSION) {
        this.settings.set({ ...defaultSettings(saved.seed), ...saved });
      }
    } catch (error) {
      this.error.set(problemMessage(error, 'Não foi possível abrir o universo.'));
      return;
    }
    await this.generate();
  }

  change<K extends keyof MapSettings>(key: K, value: MapSettings[K] | null): void {
    if (value === null || value === undefined || this.settings()[key] === value) {
      return;
    }
    this.settings.update((s) => ({ ...s, [key]: value }));
    void this.generate();
  }

  changeCountries(value: number): void {
    this.change('countries', Math.min(MAX_COUNTRIES, Math.max(1, Math.round(value))));
  }

  /** Semente digitada (para refazer um mapa conhecido). */
  changeSeed(seed: string): void {
    const clean = seed.trim().slice(0, 40);
    if (clean) {
      this.change('seed', clean);
    }
  }

  another(): void {
    this.change('seed', newSeed());
  }

  async generate(): Promise<void> {
    this.generating.set(true);
    // Deixa o indicador aparecer antes do cálculo, que ocupa o processador por alguns instantes
    await new Promise((resolve) => setTimeout(resolve, 30));
    try {
      await document.fonts?.load(`600 20px Literata`).catch(() => undefined);
      const world = generateWorld(this.settings());
      this.world.set(world);
      const canvas = this.canvas()?.nativeElement;
      if (canvas) {
        renderWorld(canvas, world, this.universe()?.name ?? '');
      }
    } finally {
      this.generating.set(false);
    }
  }

  use(): void {
    if (this.universe()?.mapUrl) {
      this.confirm.confirm({
        header: 'Trocar o mapa atual?',
        message: 'O mapa que está no universo será substituído por este.',
        acceptLabel: 'Trocar',
        rejectLabel: 'Cancelar',
        rejectButtonStyleClass: 'p-button-text p-button-secondary',
        accept: () => void this.save(),
      });
    } else {
      void this.save();
    }
  }

  private async save(): Promise<void> {
    const canvas = this.canvas()?.nativeElement;
    if (!canvas) {
      return;
    }
    this.saving.set(true);
    try {
      const image = canvas.toDataURL('image/jpeg', 0.9);
      await firstValueFrom(this.api.setUniverseMap(this.universeId(), image, this.settings()));
      this.toast.add({ severity: 'success', summary: 'Mapa salvo no universo', life: 3000 });
      await this.router.navigate(['/universes', this.universeId()], { queryParams: { passo: 'map' } });
    } catch (error) {
      this.toast.add({ severity: 'error', summary: problemMessage(error, 'Não foi possível salvar o mapa.') });
    } finally {
      this.saving.set(false);
    }
  }
}
