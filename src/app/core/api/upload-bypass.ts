import { HttpInterceptorFn } from '@angular/common/http';

/**
 * Envio de arquivo (FormData) passa direto, sem o service worker: no Safari, o pedido reenviado pelo service worker
 * perde o arquivo e a API recebe o envio vazio ("Required part 'file' is not present"). O service worker do Angular
 * respeita o cabeçalho {@code ngsw-bypass}; a API ignora.
 */
export const uploadBypassInterceptor: HttpInterceptorFn = (req, next) =>
  req.body instanceof FormData ? next(req.clone({ setHeaders: { 'ngsw-bypass': 'true' } })) : next(req);
