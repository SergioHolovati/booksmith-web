import { ActivatedRouteSnapshot, Route } from '@angular/router';

import { EditorReuseStrategy } from './editor-reuse';

function snapshot(config: Route, params: Record<string, string>): ActivatedRouteSnapshot {
  return { routeConfig: config, params } as unknown as ActivatedRouteSnapshot;
}

describe('EditorReuseStrategy', () => {
  const strategy = new EditorReuseStrategy();
  const editor: Route = { path: 'write/:chapterId' };
  const book: Route = { path: 'books/:bookId' };

  it('outro capítulo no editor é outra tela', () => {
    expect(strategy.shouldReuseRoute(snapshot(editor, { chapterId: 'b' }), snapshot(editor, { chapterId: 'a' }))).toBe(false);
    expect(strategy.shouldReuseRoute(snapshot(editor, { chapterId: 'a' }), snapshot(editor, { chapterId: 'a' }))).toBe(true);
  });

  it('nas outras telas, o padrão do Angular', () => {
    expect(strategy.shouldReuseRoute(snapshot(book, { bookId: 'b' }), snapshot(book, { bookId: 'a' }))).toBe(true);
    expect(strategy.shouldReuseRoute(snapshot(book, {}), snapshot(editor, {}))).toBe(false);
  });
});
