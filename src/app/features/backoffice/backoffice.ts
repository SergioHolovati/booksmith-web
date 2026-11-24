import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

/** As seções do backoffice, na ordem do menu. */
export const BACKOFFICE_SECTIONS = [
  { path: 'monitoramento', label: 'Monitoramento', icon: 'pi pi-chart-bar' },
  { path: 'moderacao', label: 'Moderação', icon: 'pi pi-shield' },
  { path: 'convites', label: 'Convites', icon: 'pi pi-ticket' },
] as const;

/** Área da equipe (`/backoffice`, só administradores): monitoramento, moderação de imagens e convites do beta. */
@Component({
  selector: 'app-backoffice',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './backoffice.html',
  styleUrl: './backoffice.scss',
})
export class BackofficeComponent {
  readonly sections = BACKOFFICE_SECTIONS;
}
