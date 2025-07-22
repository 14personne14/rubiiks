# 🧩 Rubiiks - Ma Collection de Casse-têtes

Une application web moderne développée avec ReactJS pour gérer et organiser votre collection de Rubik's cubes et autres casse-têtes.

## 📁 Structure du projet

```
📁 data/
  ├── 📄 cubes.json           # Base de données des cubes (format JSON)
  └── 📁 backups/             # Sauvegardes automatiques
      └── 📄 cubes-backup-YYYY-MM-DD-HHMM.json

📁 public/
  ├── 📁 cubes/               # Organisation par cube
  │   ├── 📁 cube-1/          # Dossier pour le cube ID=1
  │   │   ├── 📁 images/      # Images du cube 1
  │   │   │   ├── 🖼️ photo1.jpg
  │   │   │   ├── 🖼️ photo2.png
  │   │   │   └── 🖼️ photo3.webp
  │   │   └── 📁 solutions/   # Solutions PDF du cube 1
  │   │       ├── 📄 method-beginner.pdf
  │   │       ├── 📄 method-cfop.pdf
  │   │       └── 📄 method-roux.pdf
  │   │
  │   ├── 📁 cube-{id}/       # Pattern pour chaque cube
  │   └── ...
  │
  └── 📁 assets/              # Assets globaux (logos, etc.)
      └── 🖼️ vite.svg

� src/                       # Code source React
  ├── 📁 components/          # Composants réutilisables
  ├── 📁 pages/              # Pages de l'application
  ├── 📁 services/           # Services API
  ├── 📁 hooks/              # Hooks React personnalisés
  └── 📁 contexts/           # Contextes React

📄 server.js                 # Serveur Express.js
📄 nginx.conf                # Configuration reverse proxy
📄 docker-compose.yml        # Configuration Docker
```

### 🗃️ Format des données

```json
{
  "id": "1",
  "name": "Rubik's Cube 3x3 Classique",
  "type": "3x3",
  "brand": "Rubik's",
  "dateObtained": "2024-01-15",
  "difficulty": "Débutant",
  "personalBest": "2:45",
  "averageTime": "3:20",
  "solved": true,
  "notes": "Mon premier cube, parfait pour apprendre les bases.",
  "tags": ["classique", "débutant", "collection"],
  "files": {
    "images": ["photo1.jpg", "photo2.png"],
    "solutions": [
      {
        "filename": "method-beginner.pdf",
        "name": "Méthode débutant",
        "description": "Méthode couche par couche"
      }
    ]
  },
  "externalLinks": ["https://speedsolving.com/..."]
}
```

## 🚀 Installation et utilisation

### 🐳 Méthode Docker (Recommandée)
La méthode la plus simple pour démarrer rapidement :

```bash
# Cloner le repository
git clone https://github.com/votre-username/rubiiks.git
cd rubiiks

# Démarrage rapide avec Docker
npm run docker:prod

# Ou commandes Docker Compose
docker-compose up -d    # Démarrage
docker-compose down     # Arrêt
docker-compose logs -f  # Logs en temps réel
```

### 🌐 Accès à l'application
- **Production (nginx)** : http://localhost:8080
- **API directe** : http://localhost:3001

### 📦 Données persistantes
Les données sont automatiquement sauvegardées dans des volumes Docker :
- `rubiiks-data` : Base de données JSON
- `rubiiks-images` : Images uploadées  
- `rubiiks-pdfs` : PDFs de solutions

### 🔧 Commandes Docker utiles
```bash
# Status des conteneurs
docker-compose ps

# Reconstruction après modifications
docker-compose up -d --build

# Nettoyage complet
npm run docker:clean
```

### 📦 Installation manuelle

### Prérequis
- Node.js (version 16 ou supérieure)
- npm ou yarn

### Installation
```bash
# Cloner le repository
git clone https://github.com/votre-username/rubiiks.git
cd rubiiks

# Installer les dépendances
npm install

# Configurer l'environnement
cp .env.example .env
# Modifier .env avec vos propres valeurs

# Démarrer le backend
npm start

# Dans un autre terminal, démarrer le frontend
npm run dev
```

### Configuration de production
Voir le fichier `SECURITY.md` pour les instructions de déploiement sécurisé.

### Accès administrateur
- **URL** : `/login`
- **Mot de passe par défaut** : `admin123` (⚠️ À changer OBLIGATOIREMENT en production !)

## 🛠️ Technologies utilisées

### Frontend
- **React 18** + Vite
- **React Router DOM** pour la navigation
- **Tailwind CSS** pour le styling
- **Lucide React** pour les icônes

### Backend
- **Express.js** + Node.js
- **Multer** pour les uploads de fichiers
- **bcrypt** pour le hachage des mots de passe
- **Helmet.js** pour la sécurité
- **express-rate-limit** pour la limitation de requêtes
- **validator.js** pour la validation des données

### Sécurité
- Variables d'environnement avec dotenv
- Validation et sanitisation des entrées
- Protection CORS et CSRF
- Rate limiting et monitoring

## 📁 Structure du projet

```
rubiiks/
├── src/                    # Code source React
│   ├── components/         # Composants réutilisables
│   ├── pages/             # Pages de l'application
│   ├── hooks/             # Hooks personnalisés
│   ├── services/          # Services API
│   └── contexts/          # Contextes React
├── public/                # Fichiers statiques
│   ├── images/            # Images des cubes
│   └── solutions/         # PDFs de solutions
├── data/                  # Données JSON
│   ├── cubes.json         # Base de données des cubes
│   └── corbeille/         # Fichiers supprimés
├── server.js              # Serveur Express
├── .env.example           # Template de configuration
└── SECURITY.md           # Guide de sécurité
```

## 🔒 Sécurité

Cette application inclut des mesures de sécurité complètes pour un déploiement en production :
- Authentification robuste avec bcrypt
- Protection contre les attaques courantes
- Rate limiting et validation des entrées
- Configuration HTTPS recommandée

Consultez `SECURITY.md` pour plus de détails.

## 📋 Statut du projet

**⚠️ Projet personnel - Pas de contributions externes**

Ce projet est développé pour un usage personnel et n'accepte pas de contributions externes. Cependant, vous êtes libre de :
- 🍴 **Fork** le projet pour votre propre usage
- 🐛 **Signaler des bugs** via les issues (information seulement)
- 💡 **Partager des idées** dans les discussions

Aucune pull request ne sera acceptée. Si vous souhaitez des fonctionnalités similaires, n'hésitez pas à fork le projet et à le personnaliser selon vos besoins.

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 🤖 Développement avec IA

> **Note :** Cette application a été développée avec l'assistance de l'intelligence artificielle (GitHub Copilot) pour accélérer le développement et améliorer la qualité du code. L'IA a contribué à :
> - La génération de code React/JavaScript
> - L'implémentation des mesures de sécurité
> - La documentation et les commentaires
> - L'optimisation des performances
> 
> Cependant, toute la logique métier, l'architecture et les décisions de conception restent entièrement humaines.

---

**Fait avec ❤️ pour les passionnés de Rubik's cubes** 🧩
