import { HttpRequest, HttpResponse } from '@angular/common/http';
import { of } from 'rxjs';

import { uploadBypassInterceptor } from './upload-bypass';

describe('uploadBypassInterceptor', () => {
  const run = (req: HttpRequest<unknown>) => {
    let sent: HttpRequest<unknown> | null = null;
    uploadBypassInterceptor(req, (r) => {
      sent = r;
      return of(new HttpResponse());
    }).subscribe();
    return sent as unknown as HttpRequest<unknown>;
  };

  it('envio de arquivo passa por fora do service worker', () => {
    const form = new FormData();
    form.append('file', new Blob(['%PDF-']), 'livro.pdf');
    expect(run(new HttpRequest('POST', '/api/v1/books/1/import/pdf', form)).headers.get('ngsw-bypass')).toBe('true');
  });

  it('o resto não muda', () => {
    expect(run(new HttpRequest('PUT', '/api/v1/books/1', { title: 'x' })).headers.has('ngsw-bypass')).toBe(false);
  });
});
