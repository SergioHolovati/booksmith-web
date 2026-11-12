import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { AssistApi } from '../../../core/api/assist.api';
import { BookTextFix, BookTextItem, BookTextsResult } from '../../../core/models/api.models';
import { BookTextsComponent, groupItems } from './book-texts';

function item(label: string, source: BookTextItem['source'], kind: string, id: string | null = null): BookTextItem {
  return {
    source, id, label, quote: 'Sergio', context: '…Sergio…', problem: 'p', suggestion: 'Sérgio', kind,
    key: source, offset: 0, fix: kind !== 'fact', all: kind === 'name',
  };
}

function result(items: BookTextItem[]): BookTextsResult {
  return { items, texts: 4, provider: 'regras', model: '', local: true, remaining: 3 };
}

describe('revisar textos do livro', () => {
  it('agrupa por texto, sinopse e sobre o autor primeiro, com o caminho da tela de edição', () => {
    const groups = groupItems([
      item('Ficha de Sergio · Nome', 'character', 'name', 'c1'),
      item('Sobre o autor', 'about', 'name'),
      item('Sinopse', 'synopsis', 'name'),
      item('Sinopse', 'synopsis', 'spelling'),
    ], 'l1');

    expect(groups.map((g) => [g.label, g.items.length, g.link.join('/')])).toEqual([
      ['Sinopse', 2, '/books/l1/edit'],
      ['Sobre o autor', 1, '/books/l1/paginas'],
      ['Ficha de Sergio · Nome', 1, '/books/l1/characters/c1'],
    ]);
  });

  it('sem IA e com IA somam na mesma lista; erro aparece sem apagar o que já veio', async () => {
    const api = {
      status: signal(null),
      ensureStatus: () => Promise.resolve(),
      checkBookTexts: () => of(result([item('Sinopse', 'synopsis', 'name')])),
      compareBookTexts: () => throwError(() => new HttpErrorResponse({ status: 429 })),
    };
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: AssistApi, useValue: api }] });
    const fixture = TestBed.createComponent(BookTextsComponent);
    fixture.componentRef.setInput('bookId', 'l1');
    const component = fixture.componentInstance;

    await component.checkFree();
    expect(component.groups()).toHaveLength(1);
    expect(component.checked()).toBe(true);

    await component.compareAi();
    expect(component.error()).toBeTruthy();
    expect(component.groups()).toHaveLength(1);
    expect(component.loading()).toBeNull();
  });

  it('nomes e formatação vêm marcados; corrigir manda os trechos e revisa de novo', async () => {
    const applied: BookTextFix[][] = [];
    let checks = 0;
    const first = [item('Sinopse', 'synopsis', 'name'), item('Sinopse', 'synopsis', 'spelling'), item('Sobre o autor', 'about', 'format')];
    const api = {
      status: signal(null),
      ensureStatus: () => Promise.resolve(),
      checkBookTexts: () => of(result(checks++ === 0 ? first : [])),
      compareBookTexts: () => of(result([])),
      applyBookTexts: (_bookId: string, fixes: BookTextFix[]) => {
        applied.push(fixes);
        return of({ applied: fixes.length, skipped: 0 });
      },
    };
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: AssistApi, useValue: api }] });
    const fixture = TestBed.createComponent(BookTextsComponent);
    fixture.componentRef.setInput('bookId', 'l1');
    const component = fixture.componentInstance;

    await component.checkFree();
    // a ortografia do corretor não vem marcada: o autor escolhe
    expect(component.marked().map((i) => i.kind)).toEqual(['name', 'format']);
    component.toggle(first[1]);
    expect(component.marked()).toHaveLength(3);

    await component.fixMarked();

    expect(applied[0].map((f) => [f.key, f.quote, f.suggestion, f.all])).toEqual([
      ['synopsis', 'Sergio', 'Sérgio', true],
      ['synopsis', 'Sergio', 'Sérgio', false],
      ['about', 'Sergio', 'Sérgio', false],
    ]);
    expect(component.applied()).toBe('3 correções aplicadas.');
    // revisou de novo: a lista reflete o texto salvo
    expect(component.groups()).toHaveLength(0);
    expect(component.marked()).toHaveLength(0);
  });
});
