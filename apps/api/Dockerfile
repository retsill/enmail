# Se construye con el contexto en la RAÍZ del monorepo (ver docker-compose.yml:
# "context: .", "dockerfile: apps/api/Dockerfile") porque es un npm workspace:
# el build necesita ver package.json de los tres paquetes para instalar bien.

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci

FROM deps AS build
COPY . .
# src/generated/prisma no viaja en la imagen base (está en .dockerignore,
# es un artefacto generado) — hay que generarlo de cero acá. DATABASE_URL
# solo necesita tener forma válida en este paso: "generate" no se conecta
# a ninguna base, solo lee el schema.
ENV DATABASE_URL="mysql://user:pass@localhost:3306/placeholder"
RUN cd apps/api && npx prisma generate
RUN npm run build --workspace api

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/shared ./packages/shared
COPY --from=build /app/apps/api/dist ./apps/api/dist
# El cliente Prisma generado busca su motor de consultas nativo (el binario
# .node) relativo a esta carpeta, no a dist/ — sin copiarla, el contenedor
# arranca pero cada consulta a la base falla.
COPY --from=build /app/apps/api/src/generated ./apps/api/src/generated
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
COPY --from=build /app/apps/api/prisma.config.ts ./apps/api/prisma.config.ts
COPY --from=build /app/apps/api/package.json ./apps/api/package.json

WORKDIR /app/apps/api
EXPOSE 3001

# migrate deploy (no db push): aplica las migraciones versionadas sin pedir
# confirmación ni arriesgar datos. db:seed es seguro de re-correr siempre
# (usa upsert / revisa si el admin ya existe) — así el admin y los
# conectores quedan listos sin un paso manual aparte.
CMD ["sh", "-c", "npx prisma migrate deploy && npm run db:seed && node dist/main.js"]
