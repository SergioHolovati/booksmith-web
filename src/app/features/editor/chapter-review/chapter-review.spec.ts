import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import { Observable, of, throwError } from 'rxjs';

import { AssistApi } from '../../../core/api/assist.api';
import { ReviewCheck, ReviewRequest, ReviewResult } from '../../../core/models/api.models';
import { alreadyFixed, ChapterReviewComponent } from './chapter-review';

function result(check: ReviewCheck, nextBlock: string | null = null, part = 1, parts = 1): ReviewResult {
  return {
    findings: [{ blockId: 'b1', quote: `trecho ${check} ${part}`, problem: 'p', suggestion: 's', fix: false }],
    nextBlock,
    part,
    parts,
    remaining: 100,
    provider: 'anthropic',
    model: 'claude-haiku-5-5',
    local: false,
  };
}

function setup(answer: (request: ReviewRequest) => Observable<ReviewResult>) {
  const calls: ReviewRequest[] = [];
  const api = {
    status: signal(null),
    ensureStatus: () => Promise.resolve(),
    review: (request: ReviewRequest) => {
      calls.push(request);
      return answer(request);
    },
  };
  TestBed.configureTestingModule({
    providers: [
      { provide: AssistApi, useValue: api },
      { provide: MessageService, useValue: { add: () => undefined } },
    ],
  });
  const fixture = TestBed.createComponent(ChapterReviewComponent);
  fixture.componentRef.setInput('chapterId', 'c1');
  fixture.componentRef.setInput('bookId', 'l1');
  return { component: fixture.componentInstance, calls };
}

describe('ChapterReviewComponent', () => {
  it('roda as seis revisões em sequência, com todas as partes de cada uma', async () => {
    const { component, calls } = setup((r) =>
      of(r.check === 'spelling' && !r.fromBlock ? result('spelling', 'b9', 1, 2) : result(r.check, null, r.fromBlock ? 2 : 1, r.fromBlock ? 2 : 1)),
    );

    await component.run();

    expect(calls.map((c) => `${c.check}:${c.fromBlock ?? '-'}`)).toEqual([
      'format:-',
      'spelling:-',
      'spelling:b9',
      'style:-',
      'holes:-',
      'continuity:-',
      'improvements:-',
    ]);
    expect(component.groups().map((g) => [g.value, g.state, g.items.length])).toEqual([
      ['format', 'done', 1],
      ['spelling', 'done', 2],
      ['style', 'done', 1],
      ['holes', 'done', 1],
      ['continuity', 'done', 1],
      ['improvements', 'done', 1],
    ]);
    expect(component.running()).toBe(false);
  });

  it('uma revisão que falha não impede as outras', async () => {
    const { component, calls } = setup((r) =>
      r.check === 'holes' ? throwError(() => new HttpErrorResponse({ status: 502 })) : of(result(r.check)),
    );

    await component.run();

    expect(calls).toHaveLength(6);
    const holes = component.groups().find((g) => g.value === 'holes');
    expect(holes?.state).toBe('error');
    expect(holes?.error).toBeTruthy();
    expect(component.groups().find((g) => g.value === 'improvements')?.state).toBe('done');
  });

  it('cota esgotada para tudo: não adianta tentar as próximas', async () => {
    const { component, calls } = setup((r) =>
      r.check === 'holes' ? throwError(() => new HttpErrorResponse({ status: 429 })) : of(result(r.check)),
    );

    await component.run();

    expect(calls.map((c) => c.check)).toEqual(['format', 'spelling', 'style', 'holes']);
    expect(component.groups().map((g) => g.state)).toEqual(['done', 'done', 'done', 'error', 'stopped', 'stopped']);
  });

  it('dispensar tira o apontamento só do seu grupo', async () => {
    const { component } = setup((r) => of(result(r.check)));
    await component.run();

    const first = component.groups()[0].items[0];
    component.dismiss(first);

    expect(component.groups()[0].items).toHaveLength(0);
    expect(component.groups()[1].items).toHaveLength(1);
    expect(component.pendingCount()).toBe(5);
  });

  it('não repete uma correção que outra revisão já ofereceu no mesmo trecho', () => {
    const format = { blockId: 'b1', quote: '"próxima', problem: 'minúscula', suggestion: '"Próxima', fix: true };
    const spelling = { blockId: 'b1', quote: 'próxima pergunta', problem: 'm', suggestion: 'Próxima pergunta', fix: true };
    expect(alreadyFixed([format], spelling)).toBe(true);
    expect(alreadyFixed([format], { ...spelling, quote: 'pergunta, como' })).toBe(false);
    // outro parágrafo, ou um apontamento sem correção direta: fica
    expect(alreadyFixed([format], { ...spelling, quote: '"próxima pergunta', blockId: 'b2' })).toBe(false);
    expect(alreadyFixed([{ ...format, fix: false }], { ...spelling, quote: '"próxima pergunta' })).toBe(false);
  });
});
