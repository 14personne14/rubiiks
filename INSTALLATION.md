# 🚀 Installation de Rubiiks

**📌 Note importante :** Ce projet est personnel et n'accepte pas de contributions. Vous pouvez l'installer et l'utiliser, mais forkez-le pour vos propres modifications.

## Installation rapide

### 1. Cloner et installer
```bash
git clone [votre-repo]
cd rubiiks
npm install
```

### 2. Configuration
```bash
# Copier le template de configuration
cp .env.example .env

# Éditer .env avec vos vraies valeurs
nano .env  # ou votre éditeur préféré
```

### 3. Démarrage

#### Développement
```bash
npm run dev
```

#### Production
```bash
npm run build
npm start
```

## ⚠️ Important pour la production

1. **Changez OBLIGATOIREMENT** le mot de passe admin dans `.env`
2. **Configurez** votre domaine dans `ALLOWED_ORIGINS`
3. **Générez** une nouvelle `JWT_SECRET`

### Générer un nouveau hash de mot de passe
```bash
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('VOTRE_MOT_DE_PASSE', 10).then(hash => console.log(hash));"
```

Copiez le hash généré dans votre `.env` → `ADMIN_PASSWORD_HASH=`
