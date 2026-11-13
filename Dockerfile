# syntax=docker/dockerfile:1

# Multi-stage build: tre steg där bara det sista hamnar i den färdiga imagen.
# Basimage: officiell Node.js 24 (samma version som vid lokal utveckling), fast versionsnummer
# så att bygget blir reproducerbart. "alpine" är en liten Linux-distribution, vilket ger
# en betydligt mindre image än den vanliga Debian-baserade.

# ---------- Steg 1: deps – installera beroenden ----------
FROM node:24.21.0-alpine AS deps
WORKDIR /app
# Kopiera bara paketfilerna först. Då återanvänds Dockers cache så länge de inte ändras.
COPY package.json package-lock.json ./
# npm ci installerar exakt det som står i package-lock.json (reproducerbart).
RUN npm ci

# ---------- Steg 2: builder – bygg appen ----------
FROM node:24.21.0-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# NEXT_PUBLIC_-variabler bakas in i JavaScript-koden vid build, därför måste de vara med här.
# Render skickar tjänstens miljövariabler som build args med samma namn.
# De är offentliga och aldrig hemliga. Hemligheter ska INTE deklareras som ARG.
ARG NEXT_PUBLIC_APP_NAME
ENV NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME
ENV NEXT_TELEMETRY_DISABLED=1
# Skapar produktionsbuilden, inklusive .next/standalone (en minimal server med bara det som behövs).
RUN npm run build

# ---------- Steg 3: runner – den slutliga, minimala imagen ----------
FROM node:24.21.0-alpine AS runner
WORKDIR /app

# Produktionsläge, lyssna på alla nätverksgränssnitt (krävs i en container) och standardport 3000.
# Render skickar in sin egen PORT vid körning, och appen läser den.
ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    NEXT_TELEMETRY_DISABLED=1

# Kör som en vanlig användare i stället för root, så att ett intrång får mindre rättigheter.
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

# Kopiera bara det som behövs för att köra: den minimala servern, statiska filer och public.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

# Dokumenterar vilken port appen lyssnar på (publicerar den inte, det gör -p vid docker run).
EXPOSE 3000

# Docker markerar containern som "healthy" om /health svarar. wget finns i alpine.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/health" > /dev/null || exit 1

# Starta den minimala servern direkt med node (inte npm), så att signaler hanteras korrekt.
CMD ["node", "server.js"]
