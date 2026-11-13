# O app em produção: build do Angular numa etapa, servido pelo Caddy na outra (HTTPS automático, proxy da API).
# O Caddyfile fica em deploy/Caddyfile.
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npx ng build --configuration production

FROM caddy:2.10-alpine
COPY deploy/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist/booksmith-web/browser /srv
