/**
 * Proxy do dev server. Com ele, tudo sai do mesmo endereço do app, o que faz o Booksmith funcionar também
 * pelo celular na rede local (http://192.168.x.x:4200):
 * - /api vai para a API (porta 8090), sem o cabeçalho Origin: para o navegador, app e API têm a mesma origem,
 *   então não é preciso liberar os endereços da rede local no CORS da API;
 * - /media vai para as imagens no MinIO (porta 9000, bucket "booksmith"). Em desenvolvimento, a API devolve as
 *   URLs de imagem relativas (/media/...).
 */
export default {
  '/api': {
    target: 'http://localhost:8090',
    secure: false,
    changeOrigin: true,
    configure: (proxy) => {
      proxy.on('proxyReq', (proxyReq) => proxyReq.removeHeader('origin'));
    },
  },
  '/media': {
    target: 'http://localhost:9000',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/media/, '/booksmith'),
  },
};
