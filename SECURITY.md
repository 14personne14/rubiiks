# 🔒 Guide de Sécurité - Rubiiks

## ⚠️ AVANT DE PUBLIER EN PRODUCTION

### 1. Configuration d'Environnement

1. **Copiez `.env.example` vers `.env`**
2. **Modifiez OBLIGATOIREMENT ces valeurs :**

```bash
# Générer un hash sécurisé pour le mot de passe
ADMIN_PASSWORD_HASH=your_secure_bcrypt_hash

# Clé secrète unique pour JWT
JWT_SECRET=your_unique_jwt_secret_here

# Domaines autorisés (remplacez par vos vrais domaines)
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### 2. Génération d'un Hash de Mot de Passe Sécurisé

```bash
# Installer bcrypt si pas déjà fait
npm install bcrypt

# Générer le hash (remplacez 'votre_mot_de_passe' par votre vrai mot de passe)
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('votre_mot_de_passe', 10).then(hash => console.log('Hash:', hash));"
```

## 🛡️ Mesures de Sécurité Implémentées

### Backend (server.js)
- ✅ **Helmet.js** : Headers de sécurité HTTP
- ✅ **Rate Limiting** : Protection contre les attaques par déni de service
- ✅ **CORS restreint** : Seuls les domaines autorisés peuvent accéder à l'API
- ✅ **Validation des entrées** : Validation stricte des données utilisateur
- ✅ **Authentication bcrypt** : Hash sécurisé des mots de passe
- ✅ **Validation des fichiers** : Types MIME et tailles contrôlés
- ✅ **Gestion des erreurs** : Pas de fuite d'informations sensibles

### Frontend
- ✅ **Pas de secrets exposés** : Aucun mot de passe en dur dans le code
- ✅ **Authentification côté serveur** : Validation backend uniquement
- ✅ **LocalStorage sécurisé** : Données non sensibles uniquement

### Système de Fichiers
- ✅ **Corbeille** : Fichiers supprimés déplacés, pas effacés
- ✅ **Gitignore sécurisé** : Fichiers sensibles exclus du versioning
- ✅ **Permissions** : Accès contrôlé aux dossiers uploads

## 🚨 Vulnérabilités à Surveiller

### Configuration Serveur Web
- [ ] **HTTPS obligatoire** : Configurer un certificat SSL/TLS
- [ ] **Reverse Proxy** : Utiliser nginx ou Apache devant Node.js
- [ ] **Firewall** : Restreindre les ports d'accès

### Maintenance
- [ ] **Backups** : Sauvegarder `data/cubes.json` régulièrement
- [ ] **Logs** : Surveiller les tentatives d'intrusion
- [ ] **Updates** : Maintenir les dépendances à jour
- [ ] **Corbeille** : Vider périodiquement pour éviter l'accumulation

## 🔧 Configuration Nginx Recommandée

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    
    location / {
        try_files $uri $uri/ /index.html;
        root /path/to/rubiiks/dist;
    }
    
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location /images/ {
        expires 1d;
        add_header Cache-Control "public, immutable";
        root /path/to/rubiiks/public;
    }
    
    location /solutions/ {
        expires 1h;
        add_header Cache-Control "private, no-cache";
        root /path/to/rubiiks/public;
    }
}
```

## 📋 Checklist Pré-Déploiement

- [ ] ✅ Variables d'environnement configurées
- [ ] ✅ Hash de mot de passe généré
- [ ] ✅ Domaines CORS mis à jour
- [ ] ✅ Certificat SSL/TLS installé
- [ ] ✅ Reverse proxy configuré
- [ ] ✅ Firewall configuré
- [ ] ✅ Backups automatiques configurés
- [ ] ✅ Monitoring des logs configuré
- [ ] ✅ Tests de sécurité effectués

## 🔍 Tests de Sécurité

### Test d'authentification
```bash
# Test avec mauvais mot de passe (doit échouer)
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password":"wrong_password"}'

# Test avec bon mot de passe (doit réussir)
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password":"your_real_password"}'
```

### Test de rate limiting
```bash
# Envoyer plusieurs requêtes rapidement (doit être limité)
for i in {1..150}; do curl http://localhost:3001/api/cubes; done
```

## 📞 Contact Sécurité

En cas de découverte d'une vulnérabilité, merci de :
1. Ne PAS la publier publiquement
2. Contacter le maintainer du projet
3. Attendre confirmation avant divulgation

---

**⚠️ IMPORTANT** : Cette configuration est pour un usage personnel/éducatif. Pour un usage commercial, consultez un expert en sécurité.
