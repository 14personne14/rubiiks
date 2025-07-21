# 🧩 Rubiiks - Ma Collection de Casse-têtes

Une application web moderne développée avec ReactJS pour gérer et organiser votre collection de Rubik's cubes et autres casse-têtes.

## 🎯 Fonctionnalités

### 🏠 Page d'accueil
- **Galerie de cartes** : Affichage de tous vos cubes avec leurs photos
- **Recherche avancée** : Par nom, type, marque, tags, date, notes, difficulté
- **Filtres intelligents** : Par difficulté, statut de résolution
- **Statistiques** : Vue d'ensemble de votre collection
- **Modes d'affichage** : Grille ou liste selon vos préférences

### 🔍 Pages de détails
- **Photos multiples** : Carrousel d'images avec navigation
- **Informations complètes** : Date d'obtention, performances, notes
- **Solutions intégrées** : Liens vers PDFs internes ou sites externes
- **Tags personnalisés** : Organisation flexible de votre collection

### ⚙️ Interface d'administration
- **Gestion complète** : Ajouter, modifier, supprimer des cubes
- **Formulaires intuitifs** : Interface simple pour saisir les informations
- **Authentification sécurisée** : Accès protégé par mot de passe bcrypt
- **Aperçu instantané** : Prévisualisation avant publication

### 🛡️ Sécurité
- **Authentification bcrypt** : Hash sécurisé des mots de passe
- **Rate limiting** : Protection contre les attaques par déni de service
- **CORS sécurisé** : Restrictions des domaines autorisés
- **Validation d'entrées** : Sanitisation des données utilisateur
- **Headers de sécurité** : Protection avec Helmet.js

## 🚀 Installation et utilisation

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
