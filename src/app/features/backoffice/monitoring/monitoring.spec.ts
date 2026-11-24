import { barHeights, errorRate, incidentList, sortRoutes } from './monitoring';

describe('monitoramento', () => {
  const routes = [
    { route: 'GET /api/v1/books', requests: 100, errors: 2, averageMillis: 30 },
    { route: 'POST /api/v1/export/pdf', requests: 5, errors: 0, averageMillis: 4000 },
    { route: '(sem rota) 404', requests: 20, errors: 20, averageMillis: 1 },
  ];

  it('ordena as rotas por uso, lentidão ou erros', () => {
    expect(sortRoutes(routes, 'requests')[0].route).toBe('GET /api/v1/books');
    expect(sortRoutes(routes, 'slowest')[0].route).toBe('POST /api/v1/export/pdf');
    expect(sortRoutes(routes, 'errors')[0].route).toBe('(sem rota) 404');
    expect(errorRate(routes[0])).toBe(2);
    expect(errorRate({ ...routes[0], requests: 0 })).toBe(0);
  });

  it('dá altura às barras em relação à maior e deixa um traço nas horas pequenas', () => {
    expect(barHeights([0, 1, 50, 100])).toEqual([0, 3, 50, 100]);
    expect(barHeights([0, 0])).toEqual([0, 0]);
  });

  it('lista só os alertas que aconteceram, com nome', () => {
    expect(incidentList({ LOGIN_LOCKED: 2, RATE_LIMITED: 9, MFA_FAILED: 0, NOVO: 1 })).toEqual([
      { kind: 'RATE_LIMITED', label: 'Requisições barradas pelo limite por IP', count: 9 },
      { kind: 'LOGIN_LOCKED', label: 'Contas bloqueadas por senha errada', count: 2 },
      { kind: 'NOVO', label: 'NOVO', count: 1 },
    ]);
  });
});
