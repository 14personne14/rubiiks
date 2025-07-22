# ===============================
# 🐳 DOCKERFILE RUBIIKS - VERSION SIMPLE
# Application React + Express
# ===============================

FROM node:20-alpine

# Installer les outils nécessaires
RUN apk add --no-cache bash curl

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers de configuration
COPY package*.json ./

# Installer les dépendances
RUN npm install

# Copier le reste du code
COPY . .

# Copier et rendre exécutable le script de démarrage
COPY start.sh ./
RUN chmod +x start.sh

# Exposer les ports
EXPOSE 3001 5173

# Créer les dossiers nécessaires (sans corbeille - supprimée)
RUN mkdir -p data/backups public/cubes public/assets

# Commande de démarrage
CMD ["./start.sh"]
