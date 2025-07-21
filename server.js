import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcrypt';
import validator from 'validator';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import fsSync from 'fs';
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
      imgSrc: ["'self'", "data:", "blob:", "http://localhost:3001"], // Permettre les images du serveur local
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
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" } // Permettre les ressources cross-origin
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
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'); // Permettre l'accès cross-origin
    res.setHeader('Access-Control-Allow-Origin', '*'); // Permettre l'accès depuis n'importe quelle origine
  }
}));

app.use('/solutions', express.static(path.join(__dirname, 'public', 'solutions'), {
  setHeaders: (res, filePath) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-cache');
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'); // Permettre l'accès cross-origin
    res.setHeader('Access-Control-Allow-Origin', '*'); // Permettre l'accès depuis n'importe quelle origine
  }
}));

// Servir les fichiers statiques buildés par Vite (pour Docker)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist'), {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 an pour les assets
      }
    }
  }));
}

// Configuration de multer avec sécurité renforcée

// Configuration pour les images avec calcul dynamique du numéro
const imageStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/images/cubes/')
  },
  filename: async function (req, file, cb) {
    try {
      // Récupérer l'ID du cube depuis le formulaire pour nommer directement
      const cubeId = req.body.cubeId || `temp-${Date.now()}`;
      const extension = path.extname(file.originalname).toLowerCase();
      
      // Calculer le prochain numéro d'image pour ce cube de manière dynamique
      if (!req.nextImageNumber) {
        req.nextImageNumber = await getNextImageNumber(cubeId);
      }
      
      // Utiliser et incrémenter le compteur
      const imageNumber = req.nextImageNumber;
      req.nextImageNumber++;
      
      // Nouveau format: {id_cube}-{numéro_de_limage}.{extension}
      const filename = `${cubeId}-${imageNumber}${extension}`;
      console.log('📸 Nom fichier généré:', filename);
      cb(null, filename);
    } catch (error) {
      console.error('Erreur génération nom fichier image:', error);
      cb(error);
    }
  }
});

// Validation des fichiers images
const imageFileFilter = (req, file, cb) => {
  // Vérifier l'extension
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  if (!allowedExtensions.includes(fileExtension)) {
    return cb(new Error('Type de fichier non autorisé. Seules les images (JPG, PNG, GIF, WebP) sont acceptées.'));
  }
  
  // Vérifier le type MIME
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(new Error('Type MIME non autorisé.'));
  }
  
  cb(null, true);
};

const uploadImages = multer({ 
  storage: imageStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 10
  }
});

// Configuration pour les PDFs avec calcul dynamique du numéro
const pdfStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/solutions/pdf/')
  },
  filename: async function (req, file, cb) {
    try {
      // Récupérer l'ID du cube depuis le formulaire pour nommer directement
      const cubeId = req.body.cubeId || `temp-${Date.now()}`;
      
      // Calculer le prochain numéro de PDF pour ce cube de manière dynamique
      if (!req.nextPdfNumber) {
        req.nextPdfNumber = await getNextPdfNumber(cubeId);
      }
      
      // Utiliser et incrémenter le compteur
      const pdfNumber = req.nextPdfNumber;
      req.nextPdfNumber++;
      
      // Nouveau format: {id_cube}-{numéro_du_pdf}.pdf
      const filename = `${cubeId}-${pdfNumber}.pdf`;
      console.log('📄 Nom fichier PDF généré:', filename);
      cb(null, filename);
    } catch (error) {
      console.error('Erreur génération nom fichier PDF:', error);
      cb(error);
    }
  }
});

// Validation des fichiers PDF
const pdfFileFilter = (req, file, cb) => {
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

const uploadPdf = multer({ 
  storage: pdfStorage,
  fileFilter: pdfFileFilter,
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

// Fonction pour obtenir le prochain numéro d'image pour un cube
const getNextImageNumber = async (cubeId) => {
  try {
    const imagesDir = path.join(__dirname, 'public', 'images', 'cubes');
    const files = await fs.readdir(imagesDir);
    
    // Filtrer les fichiers qui correspondent au pattern {cubeId}-{number}.{ext}
    const imageNumbers = files
      .filter(file => file.startsWith(`${cubeId}-`) && /\.(jpg|jpeg|png|gif|webp)$/i.test(file))
      .map(file => {
        const match = file.match(new RegExp(`^${cubeId}-(\\d+)\\.`));
        return match ? parseInt(match[1]) : 0;
      })
      .filter(num => !isNaN(num));
    
    return imageNumbers.length > 0 ? Math.max(...imageNumbers) + 1 : 1;
  } catch (error) {
    console.error('Erreur lors du calcul du numéro d\'image:', error);
    return 1;
  }
};

// Fonction pour obtenir le prochain numéro de PDF pour un cube
const getNextPdfNumber = async (cubeId) => {
  try {
    const pdfsDir = path.join(__dirname, 'public', 'solutions', 'pdf');
    const files = await fs.readdir(pdfsDir);
    
    // Filtrer les fichiers qui correspondent au pattern {cubeId}-{number}.pdf
    const pdfNumbers = files
      .filter(file => file.startsWith(`${cubeId}-`) && file.endsWith('.pdf'))
      .map(file => {
        const match = file.match(new RegExp(`^${cubeId}-(\\d+)\\.pdf$`));
        return match ? parseInt(match[1]) : 0;
      })
      .filter(num => !isNaN(num));
    
    return pdfNumbers.length > 0 ? Math.max(...pdfNumbers) + 1 : 1;
  } catch (error) {
    console.error('Erreur lors du calcul du numéro de PDF:', error);
    return 1;
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

// GET /api/cubes/:id/files - Récupérer les fichiers associés à un cube
app.get('/api/cubes/:id/files', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!validator.isNumeric(id)) {
      return res.status(400).json({ error: 'ID invalide' });
    }

    // Récupérer les images
    const imagesDir = path.join(__dirname, 'public', 'images', 'cubes');
    const pdfsDir = path.join(__dirname, 'public', 'solutions', 'pdf');
    
    let imageFiles = [];
    let pdfFiles = [];
    
    try {
      const allImageFiles = await fs.readdir(imagesDir);
      imageFiles = allImageFiles
        .filter(file => file.startsWith(`${id}-`) && /\.(jpg|jpeg|png|gif|webp)$/i.test(file))
        .map(file => ({
          filename: file,
          url: `/images/cubes/${file}`,
          number: parseInt(file.match(new RegExp(`^${id}-(\\d+)\\.`))?.[1] || '0')
        }))
        .sort((a, b) => a.number - b.number);
    } catch (error) {
      console.log('Dossier images non trouvé ou vide');
    }
    
    try {
      const allPdfFiles = await fs.readdir(pdfsDir);
      pdfFiles = allPdfFiles
        .filter(file => file.startsWith(`${id}-`) && file.endsWith('.pdf'))
        .map(file => ({
          filename: file,
          url: `/solutions/pdf/${file}`,
          number: parseInt(file.match(new RegExp(`^${id}-(\\d+)\\.pdf$`))?.[1] || '0')
        }))
        .sort((a, b) => a.number - b.number);
    } catch (error) {
      console.log('Dossier PDFs non trouvé ou vide');
    }
    
    res.json({
      images: imageFiles,
      pdfs: pdfFiles,
      nextImageNumber: imageFiles.length > 0 ? Math.max(...imageFiles.map(f => f.number)) + 1 : 1,
      nextPdfNumber: pdfFiles.length > 0 ? Math.max(...pdfFiles.map(f => f.number)) + 1 : 1
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des fichiers:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/cubes - Créer un nouveau cube
app.post('/api/cubes', async (req, res) => {
  try {
    const { 
      id,  // Ajout de l'ID optionnel
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
      
      // Utiliser l'ID fourni ou en générer un nouveau
      const cubeId = id || Date.now().toString();
      
      // Vérifier que l'ID n'existe pas déjà si un ID est fourni
      if (id && cubes.some(cube => cube.id === id)) {
        return res.status(409).json({ error: 'Un cube avec cet ID existe déjà' });
      }
      
      const newCube = {
        id: cubeId,
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
    
    // Valider les mises à jour - autoriser tous les champs du nouveau format
    const allowedFields = [
      'name', 'type', 'brand', 'dateObtained', 'difficulty', 'personalBest', 
      'averageTime', 'solved', 'images', 'solutionType', 'solutionLink', 
      'notes', 'tags', 'solutionLinks', 'solutionFiles',
      // Anciens champs pour rétrocompatibilité
      'scramble', 'time', 'date', 'moves', 'image', 'solution'
    ];
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

// POST /api/upload/images - Upload de plusieurs images
app.post('/api/upload/images', uploadLimiter, uploadImages.array('images', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Aucun fichier fourni' });
    }
    
    const cubeId = req.body.cubeId;
    if (!cubeId) {
      return res.status(400).json({ error: 'ID du cube requis' });
    }
    
    console.log('📁 Upload de', req.files.length, 'fichier(s)');
    console.log('📋 Cube ID reçu:', cubeId);
    
    // Générer les URLs des images uploadées
    const imageUrls = req.files.map(file => `/images/cubes/${file.filename}`);
    
    console.log('🖼️ Images créées:', imageUrls);
    
    res.json({ 
      imageUrls,
      message: `${req.files.length} image(s) uploadée(s) avec succès`,
      count: req.files.length 
    });
  } catch (error) {
    console.error('Erreur lors de l\'upload d\'images:', error);
    res.status(500).json({ error: 'Erreur lors de l\'upload des images' });
  }
});

// POST /api/upload/solution - Upload d'une solution PDF
app.post('/api/upload/solution', uploadLimiter, uploadPdf.single('solution'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier fourni' });
    }
    
    const cubeId = req.body.cubeId;
    if (!cubeId) {
      return res.status(400).json({ error: 'ID du cube requis' });
    }
    
    console.log('📄 Upload PDF:', req.file.filename);
    console.log('📋 Cube ID reçu:', cubeId);
    
    const filename = req.file.filename;
    const solutionUrl = `/solutions/pdf/${filename}`;
    
    res.json({ 
      filename, 
      solutionUrl,
      originalName: req.file.originalname,
      message: 'Solution uploadée avec succès' 
    });
  } catch (error) {
    console.error('Erreur lors de l\'upload:', error);
    res.status(500).json({ error: 'Erreur lors de l\'upload' });
  }
});

// DELETE /api/upload/image - Supprimer une image
app.delete('/api/upload/image', async (req, res) => {
  try {
    const { imagePath } = req.body;
    
    if (!imagePath) {
      return res.status(400).json({ error: 'Chemin de l\'image requis' });
    }
    
    const fullPath = path.join(__dirname, 'public', 'images', imagePath);
    
    if (fsSync.existsSync(fullPath)) {
      await moveToTrash(fullPath, 'images');
      res.json({ message: 'Image supprimée avec succès' });
    } else {
      res.status(404).json({ error: 'Image non trouvée' });
    }
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'image:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de l\'image' });
  }
});

// DELETE /api/upload/solution - Supprimer une solution PDF
app.delete('/api/upload/solution', async (req, res) => {
  try {
    const { solutionPath } = req.body;
    
    if (!solutionPath) {
      return res.status(400).json({ error: 'Chemin de la solution requis' });
    }
    
    const fullPath = path.join(__dirname, 'public', 'solutions', 'pdf', solutionPath);
    
    if (fsSync.existsSync(fullPath)) {
      await moveToTrash(fullPath, 'solutions');
      res.json({ message: 'Solution supprimée avec succès' });
    } else {
      res.status(404).json({ error: 'Solution non trouvée' });
    }
  } catch (error) {
    console.error('Erreur lors de la suppression de la solution:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de la solution' });
  }
});

// POST /api/auth/login - Authentification admin
app.post('/api/auth/login', authLimiter, validateAuth, async (req, res) => {
  res.json({ success: true, message: 'Authentification réussie' });
});

// Route catch-all pour React Router (SPA) - doit être en dernier
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    // Éviter les routes API
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'Route API non trouvée' });
    }
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

// Gestion des erreurs de multer
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Fichier trop volumineux (max 10MB)' });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Trop de fichiers (max 10 images)' });
    }
  }
  if (error.message) {
    return res.status(400).json({ error: error.message });
  }
  res.status(500).json({ error: 'Erreur serveur' });
});

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`🚀 Serveur API démarré sur http://localhost:${PORT}`);
  console.log(`📁 Données stockées dans: ${DATA_FILE}`);
});
