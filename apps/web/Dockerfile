# Contexto: raíz del monorepo (ver docker-compose.yml). NEXT_PUBLIC_API_URL
# se hornea en el build (Next.js compila las variables NEXT_PUBLIC_* dentro
# del bundle) — por eso viene como build arg desde el .env de la raíz, no
# como variable de entorno del contenedor en tiempo de ejecución.

# Debian (glibc), no Alpine (musl): lightningcss (dependencia de Tailwind v4)
# publica binarios nativos prearmados por plataforma, y el paquete para
# "linux-x64-musl" no siempre se resuelve bien vía npm — pasa a build
# fallido con "Cannot find module '../lightningcss.linux-x64-musl.node'".
# En glibc no hay ese problema.
FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci

FROM deps AS build
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
COPY . .
RUN npm run build --workspace web

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/apps/web/public ./apps/web/public
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static

EXPOSE 3000
CMD ["node", "apps/web/server.js"]
