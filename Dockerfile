# O app em produção: build do Angular numa etapa, servido pelo Caddy na outra (HTTPS automático, proxy da API).
# O Caddyfile fica em deploy/Caddyfile. O mesmo Caddy serve o backoffice (booksmith-admin, outro domínio): o build
# dele vem do contexto extra "admin-src" (compose: additional_contexts).
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npx ng build --configuration production

FROM node:24-alpine AS admin-build
WORKDIR /admin
COPY --from=admin-src package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY --from=admin-src . .
RUN npx ng build --configuration production

FROM caddy:2.10-alpine
COPY deploy/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist/booksmith-web/browser /srv
COPY --from=admin-build /admin/dist/booksmith-admin/browser /srv-admin
