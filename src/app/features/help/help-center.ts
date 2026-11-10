import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';

import { HELP_ARTICLES, HELP_TOPICS, HelpTopic, searchHelp } from './help-articles';

/** Central de ajuda (`/ajuda`): artigos por tema, busca e o caminho para falar com o suporte. */
@Component({
  selector: 'app-help-center',
  imports: [FormsModule, RouterLink, ButtonModule, IconFieldModule, InputIconModule, InputTextModule],
  templateUrl: './help-center.html',
  styleUrl: './help-center.scss',
})
export class HelpCenterComponent {
  readonly query = signal('');
  readonly topics = Object.entries(HELP_TOPICS) as [HelpTopic, { label: string; icon: string }][];

  readonly results = computed(() => (this.query().trim() ? searchHelp(this.query()) : null));
  readonly byTopic = computed(() =>
    this.topics.map(([key, topic]) => ({ key, ...topic, articles: HELP_ARTICLES.filter((a) => a.topic === key) })),
  );
}
