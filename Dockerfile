# ===============================
# 🐳 DOCKERFILE - RUBIIKS APP
# ===============================
# Application React + Express pour gestion de cubes Rubik's

# Base image avec Node.js 20 (LTS)
FROM node:20-alpine AS base

# Installation des dépendances système nécessaires
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    libc6-compat

# Set working directory
WORKDIR /app

# Copie des fichiers de configuration
COPY package*.json ./

# ===============================
# 🔨 ÉTAPE 1: DEPENDENCIES
# ===============================
FROM base AS dependencies

# Installation des dépendances de production et développement
RUN npm ci --include=dev

# ===============================
# 🏗️ ÉTAPE 2: BUILD
# ===============================
FROM dependencies AS build

# Copie du code source
COPY . .

# Variables d'environnement pour le build
ENV NODE_ENV=production
ENV VITE_API_URL=http://localhost:3001

# Build de l'application React
RUN npm run build

# ===============================
# 🚀 ÉTAPE 3: PRODUCTION
# ===============================
FROM base AS production

# Variables d'environnement
ENV NODE_ENV=production
ENV PORT=3001

# Installation uniquement des dépendances de production
RUN npm ci --only=production && npm cache clean --force

# Création des utilisateurs et permissions
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 rubiiks

# Création des dossiers nécessaires
RUN mkdir -p /app/data /app/data/corbeille /app/public/images/cubes /app/public/solutions/pdf
RUN chown -R rubiiks:nodejs /app

# Copie des fichiers buildés depuis l'étape build
COPY --from=build --chown=rubiiks:nodejs /app/dist ./dist
COPY --from=build --chown=rubiiks:nodejs /app/server.js ./
COPY --from=build --chown=rubiiks:nodejs /app/public ./public

# Copie du fichier de données par défaut (s'il existe)
COPY --from=build --chown=rubiiks:nodejs /app/data ./data

# Copie de la configuration environnement
COPY --chown=rubiiks:nodejs .env.example ./.env

# Exposition du port
EXPOSE 3001

# Switch vers l'utilisateur non-root
USER rubiiks

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); \
  const options = { hostname: 'localhost', port: 3001, path: '/api/cubes', timeout: 2000 }; \
  const req = http.request(options, (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }); \
  req.on('error', () => process.exit(1)); \
  req.end();"

# Commande de démarrage
CMD ["node", "server.js"]
