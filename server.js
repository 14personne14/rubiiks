import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcrypt';
import validator from 'validator';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';

// Charger les variables d'environnement
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_FILE = path.join(__dirname, 'data', 'cubes.json');

// Configuration de sécurité
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || '$2b$10$8tXKvMQK5rHK1Q2vGXP4XuI5fGH7YxJ8RzT6Nm3wEr0sKlP4uQ9vy'; // rubiiks2024
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000', 'http://localhost:5173'];
const MAX_FILE_SIZE = (process.env.MAX_FILE_SIZE_MB || 10) * 1024 * 1024; // Conversion en bytes

// Fonction utilitaire pour déplacer un fichier vers la corbeille
const moveToTrash = async (sourceFilePath, type) => {
  try {
    const filename = path.basename(sourceFilePath);
    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-');
    const trashFilename = `${timestamp}_${filename}`;
    
    const trashDir = path.join(__dirname, 'data', 'corbeille', type);
    const trashFilePath = path.join(trashDir, trashFilename);
    
    // S'assurer que le dossier de corbeille existe
    await fs.mkdir(trashDir, { recursive: true });
    
    // Déplacer le fichier vers la corbeille
    await fs.rename(sourceFilePath, trashFilePath);
    
    console.log(`Fichier déplacé vers la corbeille: ${trashFilePath}`);
    return trashFilePath;
  } catch (error) {
    console.error('Erreur lors du déplacement vers la corbeille:', error);
    throw error;
  }
};

// 🛡️ MIDDLEWARES DE SÉCURITÉ

// Helmet pour les en-têtes de sécurité
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:"],
      fontSrc: ["'self'"],
      connectSrc: ["'self'"],
      mediaSrc: ["'self'"],
      objectSrc: ["'none'"],
      childSrc: ["'none'"],
      frameAncestors: ["'none'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// Rate limiting global
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limite à 100 requêtes par IP
  message: {
    error: 'Trop de requêtes depuis cette IP, réessayez dans 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting spécifique pour les uploads
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // limite à 5 uploads par minute
  message: {
    error: 'Trop d\'uploads, réessayez dans 1 minute.'
  }
});

// Rate limiting spécifique pour l'authentification
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limite à 5 tentatives de connexion par IP
  message: {
    error: 'Trop de tentatives de connexion, réessayez dans 15 minutes.'
  }
});

app.use(globalLimiter);

// CORS sécurisé
app.use(cors({
  origin: function (origin, callback) {
    // Permettre les requêtes sans origin (ex: applications mobiles)
    if (!origin) return callback(null, true);
    
    if (ALLOWED_ORIGINS.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Non autorisé par la politique CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware pour parser le JSON avec limite de taille
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Middleware de validation et sanitisation
const validateInput = (req, res, next) => {
  // Nettoyer les chaînes de caractères
  const cleanString = (str) => {
    if (typeof str !== 'string') return str;
    return validator.escape(str.trim());
  };

  // Appliquer le nettoyage récursivement
  const cleanObject = (obj) => {
    if (typeof obj === 'string') {
      return cleanString(obj);
    } else if (Array.isArray(obj)) {
      return obj.map(cleanObject);
    } else if (obj && typeof obj === 'object') {
      const cleaned = {};
      for (const [key, value] of Object.entries(obj)) {
        cleaned[key] = cleanObject(value);
      }
      return cleaned;
    }
    return obj;
  };

  req.body = cleanObject(req.body);
  next();
};

app.use(validateInput);

// Fichiers statiques avec sécurité
app.use('/images', express.static(path.join(__dirname, 'public', 'images'), {
  setHeaders: (res, filePath) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 jour
  }
}));

app.use('/solutions', express.static(path.join(__dirname, 'public', 'solutions'), {
  setHeaders: (res, filePath) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-cache');
    res.setHeader('Content-Disposition', 'inline');
  }
}));

// Configuration de multer avec sécurité renforcée
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/solutions/')
  },
  filename: function (req, file, cb) {
    // Nettoyer le nom de fichier
    const sanitizedName = file.originalname
      .replace(/[^a-zA-Z0-9\-_.]/g, '_')
      .replace(/_+/g, '_')
      .toLowerCase();
    
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + sanitizedName);
  }
});

// Validation des fichiers
const fileFilter = (req, file, cb) => {
  // Vérifier l'extension
  const allowedExtensions = ['.pdf'];
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  if (!allowedExtensions.includes(fileExtension)) {
    return cb(new Error('Type de fichier non autorisé. Seuls les PDF sont acceptés.'));
  }
  
  // Vérifier le type MIME
  const allowedMimeTypes = ['application/pdf'];
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(new Error('Type MIME non autorisé.'));
  }
  
  cb(null, true);
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1
  }
});

// Middleware d'authentification
const validateAuth = async (req, res, next) => {
  try {
    const { password } = req.body;
    
    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: 'Mot de passe requis' });
    }
    
    if (password.length > 100) {
      return res.status(400).json({ error: 'Mot de passe trop long' });
    }
    
    const isValid = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
    
    if (!isValid) {
      return res.status(401).json({ error: 'Mot de passe incorrect' });
    }
    
    next();
  } catch (error) {
    console.error('Erreur lors de la validation:', error);
    return res.status(500).json({ error: 'Erreur de validation' });
  }
};

// Utilitaires pour la gestion des données
const ensureDataFile = async () => {
  try {
    await fs.access(DATA_FILE);
  } catch (error) {
    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify([]));
  }
};

const readCubes = async () => {
  try {
    await ensureDataFile();
    const data = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Erreur lors de la lecture des cubes:', error);
    return [];
  }
};

const writeCubes = async (cubes) => {
  try {
    await ensureDataFile();
    await fs.writeFile(DATA_FILE, JSON.stringify(cubes, null, 2));
  } catch (error) {
    console.error('Erreur lors de l\'écriture des cubes:', error);
    throw error;
  }
};

// 🔗 ROUTES API

// GET /api/cubes - Récupérer tous les cubes
app.get('/api/cubes', async (req, res) => {
  try {
    const cubes = await readCubes();
    res.json(cubes);
  } catch (error) {
    console.error('Erreur lors de la récupération des cubes:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/cubes - Créer un nouveau cube
app.post('/api/cubes', async (req, res) => {
  try {
    const { 
      name, 
      type, 
      brand, 
      dateObtained, 
      difficulty, 
      personalBest, 
      averageTime, 
      solved, 
      images, 
      solutionType, 
      solutionLink, 
      notes, 
      tags,
      solutionLinks,
      solutionFiles,
      // Rétrocompatibilité avec l'ancien format
      scramble, 
      time, 
      date, 
      moves, 
      image 
    } = req.body;
    
    // Validation des données - accepter les deux formats
    if (!name) {
      return res.status(400).json({ error: 'Le nom du cube est obligatoire' });
    }

    if (typeof name !== 'string' || name.length > 100) {
      return res.status(400).json({ error: 'Nom invalide' });
    }

    // Format collection de cubes
    if (type || brand || dateObtained) {
      if (dateObtained && !validator.isISO8601(dateObtained)) {
        return res.status(400).json({ error: 'Date d\'obtention invalide' });
      }

      const cubes = await readCubes();
      const newCube = {
        id: Date.now().toString(),
        name,
        type: type || '',
        brand: brand || '',
        dateObtained: dateObtained || new Date().toISOString().split('T')[0],
        difficulty: difficulty || '',
        personalBest: personalBest || '',
        averageTime: averageTime || '',
        solved: Boolean(solved),
        images: images || [],
        solutionType: solutionType || 'none',
        solutionLink: solutionLink || '',
        notes: notes || '',
        tags: tags || [],
        solutionLinks: solutionLinks || [],
        solutionFiles: solutionFiles || []
      };
      
      cubes.push(newCube);
      await writeCubes(cubes);
      
      res.status(201).json(newCube);
      return;
    }

    // Format ancien (rétrocompatibilité)
    if (!scramble || !time || !date) {
      return res.status(400).json({ error: 'Format non reconnu. Veuillez fournir soit le format collection (type, brand) soit le format résolution (scramble, time, date)' });
    }

    if (typeof scramble !== 'string' || scramble.length > 500) {
      return res.status(400).json({ error: 'Mélange invalide' });
    }

    if (typeof time !== 'string' || time.length > 20) {
      return res.status(400).json({ error: 'Temps invalide' });
    }

    if (!validator.isISO8601(date)) {
      return res.status(400).json({ error: 'Date invalide' });
    }

    const cubes = await readCubes();
    const newCube = {
      id: Date.now().toString(),
      name,
      scramble,
      time,
      date,
      moves: moves || '',
      image: image || '',
      solution: ''
    };
    
    cubes.push(newCube);
    await writeCubes(cubes);
    
    res.status(201).json(newCube);
  } catch (error) {
    console.error('Erreur lors de la création du cube:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/cubes/:id - Mettre à jour un cube
app.put('/api/cubes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Validation de l'ID
    if (!validator.isNumeric(id)) {
      return res.status(400).json({ error: 'ID invalide' });
    }
    
    const cubes = await readCubes();
    const cubeIndex = cubes.findIndex(cube => cube.id === id);
    
    if (cubeIndex === -1) {
      return res.status(404).json({ error: 'Cube non trouvé' });
    }
    
    // Valider les mises à jour
    const allowedFields = ['name', 'scramble', 'time', 'date', 'moves', 'image', 'solution'];
    const validUpdates = {};
    
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        validUpdates[key] = value;
      }
    }
    
    cubes[cubeIndex] = { ...cubes[cubeIndex], ...validUpdates };
    await writeCubes(cubes);
    
    res.json(cubes[cubeIndex]);
  } catch (error) {
    console.error('Erreur lors de la mise à jour du cube:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /api/cubes/:id - Supprimer un cube
app.delete('/api/cubes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validation de l'ID
    if (!validator.isNumeric(id)) {
      return res.status(400).json({ error: 'ID invalide' });
    }
    
    const cubes = await readCubes();
    const cubeIndex = cubes.findIndex(cube => cube.id === id);
    
    if (cubeIndex === -1) {
      return res.status(404).json({ error: 'Cube non trouvé' });
    }
    
    const cube = cubes[cubeIndex];
    
    // Déplacer les fichiers associés vers la corbeille
    try {
      if (cube.image) {
        const imagePath = path.join(__dirname, 'public', 'images', cube.image);
        try {
          await fs.access(imagePath);
          await moveToTrash(imagePath, 'images');
        } catch (error) {
          console.log(`Image non trouvée ou déjà supprimée: ${imagePath}`);
        }
      }
      
      if (cube.solution) {
        const solutionPath = path.join(__dirname, 'public', 'solutions', cube.solution);
        try {
          await fs.access(solutionPath);
          await moveToTrash(solutionPath, 'solutions');
        } catch (error) {
          console.log(`Solution non trouvée ou déjà supprimée: ${solutionPath}`);
        }
      }
    } catch (error) {
      console.error('Erreur lors du déplacement des fichiers vers la corbeille:', error);
      // Continue même si le déplacement échoue
    }
    
    cubes.splice(cubeIndex, 1);
    await writeCubes(cubes);
    
    res.json({ message: 'Cube supprimé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression du cube:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/upload/solution - Upload d'une solution PDF
app.post('/api/upload/solution', uploadLimiter, upload.single('solution'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier fourni' });
    }
    
    const filename = req.file.filename;
    res.json({ filename, message: 'Solution uploadée avec succès' });
  } catch (error) {
    console.error('Erreur lors de l\'upload:', error);
    res.status(500).json({ error: 'Erreur lors de l\'upload' });
  }
});

// POST /api/auth/login - Authentification admin
app.post('/api/auth/login', authLimiter, validateAuth, async (req, res) => {
  res.json({ success: true, message: 'Authentification réussie' });
});

// Gestion des erreurs de multer
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Fichier trop volumineux (max 10MB)' });
    }
  }
  res.status(500).json({ error: error.message });
});

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`🚀 Serveur API démarré sur http://localhost:${PORT}`);
  console.log(`📁 Données stockées dans: ${DATA_FILE}`);
});
