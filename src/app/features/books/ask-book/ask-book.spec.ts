import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';

import { AssistApi } from '../../../core/api/assist.api';
import { AskRequest, AskResult } from '../../../core/models/api.models';
import { AskBookComponent } from './ask-book';

function answer(text: string): AskResult {
  return {
    answer: text,
    citations: [{ chapterId: 'c1', chapter: 1, chapterTitle: 'A carta', blockId: 'b1', quote: 'queimou a carta' }],
    provider: 'anthropic',
    model: 'claude-haiku-5-5',
    local: false,
    remaining: 99,
  };
}

function setup(reply: (request: AskRequest) => Observable<AskResult>) {
  const calls: AskRequest[] = [];
  const api = {
    status: signal(null),
    ensureStatus: () => Promise.resolve(),
    ask: (request: AskRequest) => {
      calls.push(request);
      return reply(request);
    },
  };
  TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: AssistApi, useValue: api }] });
  const fixture = TestBed.createComponent(AskBookComponent);
  fixture.componentRef.setInput('bookId', 'l1');
  return { component: fixture.componentInstance, calls };
}

describe('AskBookComponent', () => {
  it('pergunta, mostra a resposta com as fontes e limpa a caixa', async () => {
    const { component, calls } = setup(() => of(answer('Ninguém sabe.')));
    component.question.set('  Quem sabe da carta?  ');

    await component.ask();

    expect(calls).toEqual([{ bookId: 'l1', question: 'Quem sabe da carta?' }]);
    expect(component.history()[0].result?.answer).toBe('Ninguém sabe.');
    expect(component.history()[0].result?.citations[0].blockId).toBe('b1');
    expect(component.question()).toBe('');
    expect(component.loading()).toBe(false);
  });

  it('erro fica na lista e a pergunta continua na caixa para tentar de novo', async () => {
    const { component } = setup(() => throwError(() => new HttpErrorResponse({ status: 429 })));
    component.question.set('Quem sabe da carta?');

    await component.ask();

    expect(component.history()[0].error).toBeTruthy();
    expect(component.question()).toBe('Quem sabe da carta?');
  });

  it('guarda só as cinco últimas perguntas, a mais nova primeiro', async () => {
    const { component } = setup((r) => of(answer(r.question)));
    for (let i = 1; i <= 7; i++) {
      component.question.set(`Pergunta ${i}`);
      await component.ask();
    }

    expect(component.history().map((e) => e.question)).toEqual([
      'Pergunta 7', 'Pergunta 6', 'Pergunta 5', 'Pergunta 4', 'Pergunta 3',
    ]);
  });

  it('pergunta vazia não chama a IA; Enter pergunta e Shift+Enter quebra a linha', async () => {
    const { component, calls } = setup(() => of(answer('ok')));
    await component.ask();
    expect(calls).toHaveLength(0);

    component.question.set('Quem é Lia?');
    component.onKey(new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true }));
    expect(calls).toHaveLength(0);
    component.onKey(new KeyboardEvent('keydown', { key: 'Enter' }));
    await Promise.resolve();
    expect(calls).toHaveLength(1);
  });

  it('o rótulo do capítulo usa o título quando há', () => {
    const { component } = setup(() => of(answer('ok')));
    expect(component.chapterLabel(3, 'A fuga')).toBe('Cap. 3 · A fuga');
    expect(component.chapterLabel(3, null)).toBe('Capítulo 3');
  });
});
