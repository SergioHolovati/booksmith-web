import { ActivatedRouteSnapshot, BaseRouteReuseStrategy } from '@angular/router';

/**
 * O editor carrega o capítulo ao abrir (editor, salvamento automático, rascunho offline). Ir de um capítulo para outro
 * (a próxima página do livro ilustrado) muda só o parâmetro da rota, e o Angular reaproveitaria a tela com o capítulo
 * antigo: aqui, outro capítulo é outra tela (a antiga salva o que falta ao fechar).
 */
export class EditorReuseStrategy extends BaseRouteReuseStrategy {
  override shouldReuseRoute(future: ActivatedRouteSnapshot, current: ActivatedRouteSnapshot): boolean {
    if (future.routeConfig !== current.routeConfig) {
      return false;
    }
    if (future.routeConfig?.path === 'write/:chapterId') {
      return future.params['chapterId'] === current.params['chapterId'];
    }
    return true;
  }
}
