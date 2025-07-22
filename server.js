import express from 'express';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';

// Note: validator.js n'est pas utilisé, nous utilisons des validations simples

// Charger les variables d'environnement
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || 'localhost';

// Chemins configurables
const DATA_DIR = process.env.DATA_DIR || 'data';
const DATA_FILE = path.join(__dirname, DATA_DIR, process.env.DATA_FILE || 'cubes.json');
const PUBLIC_DIR = process.env.PUBLIC_DIR || 'public';
const CUBES_DIR = process.env.CUBES_DIR || 'cubes';
const IMAGES_SUBDIR = process.env.IMAGES_SUBDIR || 'images';
const SOLUTIONS_SUBDIR = process.env.SOLUTIONS_SUBDIR || 'solutions';

// Configuration simple
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || '$2b$10$8tXKvMQK5rHK1Q2vGXP4XuI5fGH7YxJ8RzT6Nm3wEr0sKlP4uQ9vy';
const MAX_FILE_SIZE = (process.env.MAX_FILE_SIZE_MB || 10) * 1024 * 1024;
const MAX_IMAGES_PER_CUBE = parseInt(process.env.MAX_IMAGES_PER_CUBE) || 10;
const MAX_SOLUTIONS_PER_CUBE = parseInt(process.env.MAX_SOLUTIONS_PER_CUBE) || 5;

// Configuration des types de fichiers
const ALLOWED_IMAGE_EXTENSIONS = (process.env.ALLOWED_IMAGE_EXTENSIONS || '.jpg,.jpeg,.png,.gif,.webp').split(',');
const ALLOWED_IMAGE_MIMETYPES = (process.env.ALLOWED_IMAGE_MIMETYPES || 'image/jpeg,image/jpg,image/png,image/gif,image/webp').split(',');
const ALLOWED_PDF_EXTENSIONS = (process.env.ALLOWED_PDF_EXTENSIONS || '.pdf').split(',');
const ALLOWED_PDF_MIMETYPES = (process.env.ALLOWED_PDF_MIMETYPES || 'application/pdf').split(',');

// Configuration du cache
const CACHE_STATIC_FILES = process.env.CACHE_STATIC_FILES || 31536000;
const CACHE_HTML_FILES = process.env.CACHE_HTML_FILES || 0;

// Validation
const MAX_NAME_LENGTH = parseInt(process.env.MAX_NAME_LENGTH) || 100;
const MAX_SCRAMBLE_LENGTH = parseInt(process.env.MAX_SCRAMBLE_LENGTH) || 500;
const MAX_TIME_LENGTH = parseInt(process.env.MAX_TIME_LENGTH) || 20;

// 🛠️ MIDDLEWARES BASIQUES

// Parser JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Fichiers statiques avec nouvelle structure
app.use(`/${CUBES_DIR}`, express.static(path.join(__dirname, PUBLIC_DIR, CUBES_DIR)));
app.use('/assets', express.static(path.join(__dirname, PUBLIC_DIR, 'assets')));

// Servir les fichiers statiques buildés par Vite (pour Docker)
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, 'dist');
  if (fsSync.existsSync(distPath)) {
    app.use(express.static(distPath, {
      setHeaders: (res, filePath) => {
        // Configuration des types MIME et cache
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', `no-cache, max-age=${CACHE_HTML_FILES}`);
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
        } else if (filePath.endsWith('.js')) {
          res.setHeader('Cache-Control', `public, max-age=${CACHE_STATIC_FILES}`);
          res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        } else if (filePath.endsWith('.css')) {
          res.setHeader('Cache-Control', `public, max-age=${CACHE_STATIC_FILES}`);
          res.setHeader('Content-Type', 'text/css; charset=utf-8');
        } else {
          res.setHeader('Cache-Control', `public, max-age=${CACHE_STATIC_FILES}`);
        }
      }
    }));
  }
}

// Fonction pour obtenir le prochain numéro d'image pour un cube
const getNextImageNumber = (cubeId) => {
  const cubeDir = path.join(PUBLIC_DIR, CUBES_DIR, `cube-${cubeId}`, IMAGES_SUBDIR);
  
  if (!fsSync.existsSync(cubeDir)) {
    return 1;
  }
  
  const files = fsSync.readdirSync(cubeDir);
  const imageFiles = files.filter(file => {
    const ext = path.extname(file).toLowerCase();
    return ALLOWED_IMAGE_EXTENSIONS.includes(ext);
  });
  
  // Trouver le plus grand numéro existant
  let maxNumber = 0;
  imageFiles.forEach(file => {
    const match = file.match(/^image-(\d+)\./);
    if (match) {
      const num = parseInt(match[1]);
      if (num > maxNumber) maxNumber = num;
    }
  });
  
  return maxNumber + 1;
};

// Fonction pour obtenir le prochain numéro de solution pour un cube
const getNextSolutionNumber = (cubeId) => {
  const cubeDir = path.join(PUBLIC_DIR, CUBES_DIR, `cube-${cubeId}`, SOLUTIONS_SUBDIR);
  
  if (!fsSync.existsSync(cubeDir)) {
    return 1;
  }
  
  const files = fsSync.readdirSync(cubeDir);
  const pdfFiles = files.filter(file => {
    return file.endsWith('.pdf') && file.startsWith('solution-');
  });
  
  // Trouver le plus grand numéro existant
  let maxNumber = 0;
  pdfFiles.forEach(file => {
    const match = file.match(/^solution-(\d+)\.pdf$/);
    if (match) {
      const num = parseInt(match[1]);
      if (num > maxNumber) maxNumber = num;
    }
  });
  
  return maxNumber + 1;
};

// Configuration de multer avec sécurité renforcée

// Configuration pour les images avec nouvelle structure
const imageStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const cubeId = req.body.cubeId || `temp-${Date.now()}`;
    const cubeDir = path.join(PUBLIC_DIR, CUBES_DIR, `cube-${cubeId}`, IMAGES_SUBDIR);
    
    // Créer le dossier s'il n'existe pas
    if (!fsSync.existsSync(cubeDir)) {
      fsSync.mkdirSync(cubeDir, { recursive: true });
    }
    
    cb(null, cubeDir);
  },
  filename: function (req, file, cb) {
    const cubeId = req.body.cubeId || `temp-${Date.now()}`;
    const imageNumber = getNextImageNumber(cubeId);
    const fileExtension = path.extname(file.originalname).toLowerCase();
    const newFileName = `image-${imageNumber}${fileExtension}`;
    
    console.log(`📷 Renommage: ${file.originalname} → ${newFileName}`);
    cb(null, newFileName);
  }
});

// Validation des fichiers images
const imageFileFilter = (req, file, cb) => {
  // Vérifier l'extension
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  if (!ALLOWED_IMAGE_EXTENSIONS.includes(fileExtension)) {
    return cb(new Error(`Type de fichier non autorisé. Seules les images (${ALLOWED_IMAGE_EXTENSIONS.join(', ')}) sont acceptées.`));
  }
  
  // Vérifier le type MIME
  if (!ALLOWED_IMAGE_MIMETYPES.includes(file.mimetype)) {
    return cb(new Error('Type MIME non autorisé.'));
  }
  
  cb(null, true);
};

const uploadImages = multer({ 
  storage: imageStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_IMAGES_PER_CUBE
  }
});

// Configuration pour les PDFs avec nouvelle structure
const pdfStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const cubeId = req.body.cubeId || `temp-${Date.now()}`;
    const cubeDir = path.join(PUBLIC_DIR, CUBES_DIR, `cube-${cubeId}`, SOLUTIONS_SUBDIR);
    
    // Créer le dossier s'il n'existe pas
    if (!fsSync.existsSync(cubeDir)) {
      fsSync.mkdirSync(cubeDir, { recursive: true });
    }
    
    cb(null, cubeDir);
  },
  filename: function (req, file, cb) {
    const cubeId = req.body.cubeId || `temp-${Date.now()}`;
    const solutionNumber = getNextSolutionNumber(cubeId);
    const newFileName = `solution-${solutionNumber}.pdf`;
    
    console.log(`📄 Renommage: ${file.originalname} → ${newFileName}`);
    cb(null, newFileName);
  }
});

// Validation des fichiers PDF
const pdfFileFilter = (req, file, cb) => {
  // Vérifier l'extension
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  if (!ALLOWED_PDF_EXTENSIONS.includes(fileExtension)) {
    return cb(new Error(`Type de fichier non autorisé. Seuls les PDF (${ALLOWED_PDF_EXTENSIONS.join(', ')}) sont acceptés.`));
  }
  
  // Vérifier le type MIME
  if (!ALLOWED_PDF_MIMETYPES.includes(file.mimetype)) {
    return cb(new Error('Type MIME non autorisé.'));
  }
  
  cb(null, true);
};

const uploadPdf = multer({ 
  storage: pdfStorage,
  fileFilter: pdfFileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_SOLUTIONS_PER_CUBE
  }
});

// Utilitaires pour la gestion des données
const ensureDataFile = async () => {
  try {
    await fs.access(DATA_FILE);
  } catch (error) {
    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify([]));
  }
};

// Fonction pour générer le prochain ID séquentiel
const getNextCubeId = (cubes) => {
  if (cubes.length === 0) return "1";
  
  // Trouver le plus grand ID numérique existant
  const numericIds = cubes
    .map(cube => parseInt(cube.id))
    .filter(id => !isNaN(id))
    .sort((a, b) => b - a);
  
  const maxId = numericIds.length > 0 ? numericIds[0] : 0;
  return (maxId + 1).toString();
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

// GET /api/cubes/new-id - Générer un nouvel ID séquentiel
app.get('/api/cubes/new-id', async (req, res) => {
  try {
    const cubes = await readCubes();
    const newId = getNextCubeId(cubes);
    res.json({ id: newId });
  } catch (error) {
    console.error('Erreur lors de la génération de l\'ID:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/cubes/:id - Récupérer un cube par son ID
app.get('/api/cubes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const cubes = await readCubes();
    const cube = cubes.find(c => c.id === id);
    
    if (!cube) {
      return res.status(404).json({ error: 'Cube non trouvé' });
    }
    
    res.json(cube);
  } catch (error) {
    console.error('Erreur lors de la récupération du cube:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/cubes/:id/files - Récupérer les fichiers associés à un cube
app.get('/api/cubes/:id/files', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validation simple de l'ID
    if (!id || isNaN(Number(id))) {
      return res.status(400).json({ error: 'ID invalide' });
    }

    // Nouveaux chemins avec structure par cube
    const cubeDir = path.join(__dirname, PUBLIC_DIR, CUBES_DIR, `cube-${id}`);
    const imagesDir = path.join(cubeDir, IMAGES_SUBDIR);
    const solutionsDir = path.join(cubeDir, SOLUTIONS_SUBDIR);
    
    let imageFiles = [];
    let solutionFiles = [];

    // Récupérer les images
    try {
      if (fsSync.existsSync(imagesDir)) {
        const allImageFiles = await fs.readdir(imagesDir);
        imageFiles = allImageFiles
          .filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file))
          .map(file => ({
            filename: file,
            url: `/${CUBES_DIR}/cube-${id}/${IMAGES_SUBDIR}/${file}`
          }));
      }
    } catch (error) {
      console.log('Dossier images non trouvé ou vide');
    }
    
    // Récupérer les solutions PDF
    try {
      if (fsSync.existsSync(solutionsDir)) {
        const allSolutionFiles = await fs.readdir(solutionsDir);
        solutionFiles = allSolutionFiles
          .filter(file => file.endsWith('.pdf'))
          .map(file => ({
            filename: file,
            url: `/${CUBES_DIR}/cube-${id}/${SOLUTIONS_SUBDIR}/${file}`
          }));
      }
    } catch (error) {
      console.log('Dossier solutions non trouvé ou vide');
    }
    
    res.json({
      images: imageFiles,
      solutions: solutionFiles
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

    if (typeof name !== 'string' || name.length > MAX_NAME_LENGTH) {
      return res.status(400).json({ error: `Nom invalide (max ${MAX_NAME_LENGTH} caractères)` });
    }

    // Format collection de cubes
    if (type || brand || dateObtained) {
      // Validation simple de la date (format YYYY-MM-DD)
      if (dateObtained && !/^\d{4}-\d{2}-\d{2}$/.test(dateObtained)) {
        return res.status(400).json({ error: 'Date d\'obtention invalide (format YYYY-MM-DD attendu)' });
      }

      const cubes = await readCubes();
      
      // Utiliser l'ID fourni ou générer un ID séquentiel
      const cubeId = id || getNextCubeId(cubes);
      
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

    if (typeof scramble !== 'string' || scramble.length > MAX_SCRAMBLE_LENGTH) {
      return res.status(400).json({ error: `Mélange invalide (max ${MAX_SCRAMBLE_LENGTH} caractères)` });
    }

    if (typeof time !== 'string' || time.length > MAX_TIME_LENGTH) {
      return res.status(400).json({ error: `Temps invalide (max ${MAX_TIME_LENGTH} caractères)` });
    }

    // Validation simple de la date (format YYYY-MM-DD)
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Date invalide (format YYYY-MM-DD attendu)' });
    }

    const cubes = await readCubes();
    const newCube = {
      id: getNextCubeId(cubes),
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
    
    // Validation simple de l'ID
    if (!id || isNaN(Number(id))) {
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
    
    // Validation simple de l'ID
    if (!id || isNaN(Number(id))) {
      return res.status(400).json({ error: 'ID invalide' });
    }
    
    const cubes = await readCubes();
    const cubeIndex = cubes.findIndex(cube => cube.id === id);
    
    if (cubeIndex === -1) {
      return res.status(404).json({ error: 'Cube non trouvé' });
    }
    
    const cube = cubes[cubeIndex];
    
    // Supprimer directement les fichiers associés avec nouvelle structure
    try {
      const cubeDir = path.join(__dirname, PUBLIC_DIR, CUBES_DIR, `cube-${id}`);
      if (fsSync.existsSync(cubeDir)) {
        await fs.rm(cubeDir, { recursive: true, force: true });
        console.log(`Dossier du cube ${id} supprimé: ${cubeDir}`);
      }
    } catch (error) {
      console.error('Erreur lors de la suppression des fichiers:', error);
      // Continue même si la suppression échoue
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
app.post('/api/upload/images', uploadImages.array('images', MAX_IMAGES_PER_CUBE), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Aucun fichier fourni' });
    }
    
    const cubeId = req.body.cubeId;
    if (!cubeId) {
      return res.status(400).json({ error: 'ID du cube requis' });
    }
    
    console.log('📁 Upload de', req.files.length, 'fichier(s) pour cube:', cubeId);
    
    // Générer les URLs des images uploadées avec nouvelle structure
    const imageUrls = req.files.map(file => {
      const relativePath = path.relative(path.join(__dirname, PUBLIC_DIR), file.path);
      return `/${relativePath.replace(/\\/g, '/')}`;
    });
    
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
app.post('/api/upload/solution', uploadPdf.single('solution'), async (req, res) => {
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
    // Nouveau chemin avec structure par cube
    const solutionUrl = `/${CUBES_DIR}/cube-${cubeId}/${SOLUTIONS_SUBDIR}/${filename}`;
    
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
    
    // Nouvelle structure: imagePath devrait être comme "/{CUBES_DIR}/cube-1/{IMAGES_SUBDIR}/photo.jpg"
    const fullPath = path.join(__dirname, PUBLIC_DIR, imagePath.replace(/^\//, ''));
    
    if (fsSync.existsSync(fullPath)) {
      await fs.unlink(fullPath);
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
    
    // Nouvelle structure: solutionPath devrait être comme "/{CUBES_DIR}/cube-1/{SOLUTIONS_SUBDIR}/solution.pdf"
    const fullPath = path.join(__dirname, PUBLIC_DIR, solutionPath.replace(/^\//, ''));
    
    if (fsSync.existsSync(fullPath)) {
      await fs.unlink(fullPath);
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
app.post('/api/auth/login', async (req, res) => {
  res.json({ success: true, message: 'Authentification réussie' });
});

// Route catch-all pour React Router (SPA) - doit être en dernier
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    // Éviter les routes API
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'Route API non trouvée' });
    }
    
    // Éviter d'intercepter les assets (CSS, JS, images, etc.)
    if (req.path.startsWith('/assets/') || 
        req.path.endsWith('.js') || 
        req.path.endsWith('.css') || 
        req.path.endsWith('.ico') || 
        req.path.endsWith('.png') || 
        req.path.endsWith('.jpg') || 
        req.path.endsWith('.svg')) {
      return res.status(404).send('Asset not found');
    }
    
    // Vérifier que le fichier index.html existe avant de le servir
    const indexPath = path.join(__dirname, 'dist', 'index.html');
    if (fsSync.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).json({ error: 'Application non buildée. Exécutez "npm run build" d\'abord.' });
    }
  });
}

// Gestion des erreurs de multer
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: `Fichier trop volumineux (max ${process.env.MAX_FILE_SIZE_MB}MB)` });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: `Trop de fichiers (max ${MAX_IMAGES_PER_CUBE} images)` });
    }
  }
  if (error.message) {
    return res.status(400).json({ error: error.message });
  }
  res.status(500).json({ error: 'Erreur serveur' });
});

// Démarrage du serveur
const server = app.listen(PORT, HOST, () => {
  console.log(`🚀 Serveur API démarré sur http://${HOST}:${PORT}`);
  console.log(`📁 Données stockées dans: ${DATA_FILE}`);
  console.log(`📂 Fichiers publics dans: ${path.join(__dirname, PUBLIC_DIR)}`);
  console.log(`🔧 Mode: ${process.env.NODE_ENV}`);
  if (process.env.DEBUG_MODE === 'true') {
    console.log('🐛 Mode debug activé');
  }
});
