import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AppearanceField, AppearanceValue, AppearanceValues } from '../../core/models/api.models';
import { BuilderFieldComponent } from '../builder/builder-field';

export interface CustomValueChange {
  key: string;
  value: AppearanceValue | null;
}

/**
 * Os campos próprios do autor dentro de uma ficha (personagem, lugar, ficha do mundo): os mesmos controles dos
 * formulários do sistema, e o atalho para criar ou mudar os campos deste tipo de ficha no universo.
 */
@Component({
  selector: 'app-custom-fields',
  imports: [RouterLink, BuilderFieldComponent],
  templateUrl: './custom-fields.html',
  styleUrl: './custom-fields.scss',
})
export class CustomFieldsComponent {
  readonly universeId = input.required<string>();
  /** Tipo de ficha: "character", "place" ou um tipo do mundo ("creature"...). */
  readonly scope = input.required<string>();
  readonly fields = input<AppearanceField[]>([]);
  readonly values = input<AppearanceValues>({});
  readonly valueChange = output<CustomValueChange>();
}
