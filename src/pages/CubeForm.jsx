import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCubesData } from '../hooks/useCubesData';
import { uploadService } from '../services/uploadService';

const CubeForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin, isLoading: authLoading } = useAuth();
  const { getCubeById, addCube, updateCube, isLoading: cubesLoading, cubes } = useCubesData();
  
  const isEditMode = Boolean(id);
  const existingCube = isEditMode ? getCubeById(id) : null;

  const [formData, setFormData] = useState({
    name: '',
    type: '',
    brand: '',
    dateObtained: '',
    difficulty: '',
    personalBest: '',
    averageTime: '',
    solved: false,
    images: [],
    solutionLinks: [],
    solutionFiles: [], // Structure: [{path: "/solutions/pdf/...", name: "Mon nom personnalisé"}]
    notes: '',
    tags: []
  });

  const [tagInput, setTagInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableTags, setAvailableTags] = useState([]);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadingSolution, setUploadingSolution] = useState(false);
  const [newSolutionLink, setNewSolutionLink] = useState('');

  useEffect(() => {
    // Extraire tous les tags existants de tous les cubes
    if (cubes) {
      const allTags = cubes.reduce((tags, cube) => {
        if (cube.tags) {
          cube.tags.forEach(tag => {
            if (!tags.includes(tag)) {
              tags.push(tag);
            }
          });
        }
        return tags;
      }, []);
      setAvailableTags(allTags.sort());
    }
  }, [cubes]);

  useEffect(() => {
    if (isEditMode && existingCube) {
      // Normaliser les données pour la compatibilité avec les anciens formats
      const normalizedCube = {
        ...existingCube,
        // Convertir imageUrl vers images si nécessaire
        images: existingCube.images || (existingCube.imageUrl ? [existingCube.imageUrl] : []),
        // Normaliser solved (peut être isSolved dans les anciens formats)
        solved: existingCube.solved !== undefined ? existingCube.solved : existingCube.isSolved || false,
        // S'assurer que tags existe
        tags: existingCube.tags || [],
        // Convertir l'ancien format vers le nouveau
        solutionLinks: existingCube.solutionLinks || (existingCube.solutionLink && existingCube.solutionType !== 'pdf' ? [existingCube.solutionLink] : []),
        solutionFiles: existingCube.solutionFiles || (existingCube.solutionPdfLink ? [{ path: existingCube.solutionPdfLink, name: existingCube.solutionPdfLink.split('/').pop().replace(/\.[^/.]+$/, '') }] : [])
          .map(file => {
            // Normaliser vers le nouveau format objet si c'est encore une string
            if (typeof file === 'string') {
              return { path: file, name: file.split('/').pop().replace(/\.[^/.]+$/, '') };
            }
            return file;
          })
      };
      
      setFormData(normalizedCube);
    }
  }, [isEditMode, existingCube]);

  if (authLoading || cubesLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/login" state={{ from: { pathname: location.pathname } }} replace />;
  }

  if (isEditMode && !existingCube) {
    return <Navigate to="/admin" replace />;
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleAddTag = (tag = null) => {
    const tagToAdd = tag || tagInput.trim();
    if (tagToAdd && !formData.tags.includes(tagToAdd)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagToAdd]
      }));
      setTagInput('');
      setShowTagSuggestions(false);
    }
  };

  const removeTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    
    // Si c'est déjà au bon format (min:sec), on le garde
    if (/^\d+:\d{2}$/.test(timeString)) {
      return timeString;
    }
    
    // Extraire les chiffres
    const numbers = timeString.match(/\d+/g);
    if (!numbers) return timeString;
    
    if (numbers.length === 1) {
      // Un seul nombre, on assume que ce sont des secondes
      const seconds = parseInt(numbers[0]);
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return minutes > 0 ? `${minutes}:${remainingSeconds.toString().padStart(2, '0')}` : `0:${remainingSeconds.toString().padStart(2, '0')}`;
    } else if (numbers.length >= 2) {
      // Deux nombres ou plus, on assume min:sec
      return `${numbers[0]}:${numbers[1].padStart(2, '0')}`;
    }
    
    return timeString;
  };

  const handleTimeChange = (e, field) => {
    const { value } = e.target;
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleTimeBlur = (e, field) => {
    const { value } = e.target;
    const formattedTime = formatTime(value);
    setFormData(prev => ({
      ...prev,
      [field]: formattedTime
    }));
  };

  const filteredTags = availableTags.filter(tag => 
    tag.toLowerCase().includes(tagInput.toLowerCase()) && 
    !formData.tags.includes(tag)
  );

  // Gestion des uploads d'images
  const handleImageUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    console.log('🔄 Upload de', files.length, 'image(s)');
    setUploadingImages(true);
    try {
      // Utiliser l'ID existant du cube ou générer un ID temporaire pour le nommage
      const cubeId = isEditMode ? id : `temp-${Date.now()}`;
      console.log('📋 Cube ID utilisé:', cubeId);
      
      const result = await uploadService.uploadImages(files, cubeId);
      console.log('✅ Résultat upload:', result);
      
      // Ajouter les nouvelles images à la liste existante
      const newImages = [...formData.images, ...result.imageUrls];
      setFormData(prev => ({
        ...prev,
        images: newImages
      }));
      console.log('📷 Images mises à jour:', newImages);
    } catch (error) {
      console.error('❌ Erreur upload:', error);
      alert('Erreur lors de l\'upload des images: ' + error.message);
    } finally {
      setUploadingImages(false);
      // Reset l'input file
      e.target.value = '';
    }
  };

  // Supprimer une image
  const handleImageDelete = async (imageIndex, imagePath) => {
    try {
      // Supprimer le fichier du serveur seulement si c'est un fichier local
      if (imagePath.startsWith('/images/cubes/')) {
        await uploadService.deleteImage(imagePath);
      }
      
      // Retirer l'image de la liste
      const newImages = formData.images.filter((_, index) => index !== imageIndex);
      setFormData(prev => ({
        ...prev,
        images: newImages
      }));
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      // Même en cas d'erreur côté serveur, on retire l'image de la liste
      const newImages = formData.images.filter((_, index) => index !== imageIndex);
      setFormData(prev => ({
        ...prev,
        images: newImages
      }));
    }
  };

  // Gestion de l'upload de solution PDF
  const handleSolutionUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingSolution(true);
    try {
      const cubeId = formData.id || 'temp';
      const uploadPromises = files.map(file => uploadService.uploadSolution(file, cubeId));
      const results = await Promise.all(uploadPromises);
      
      console.log('Solutions uploadées:', results);
      
      // Créer des objets avec path et nom par défaut (nom original du fichier)
      const newSolutionFiles = results.map((result, index) => ({
        path: result.solutionUrl,
        name: files[index].name.replace(/\.[^/.]+$/, '') // Enlever l'extension
      }));
      
      setFormData(prev => ({
        ...prev,
        solutionFiles: [...(prev.solutionFiles || []), ...newSolutionFiles]
      }));
    } catch (error) {
      alert('Erreur lors de l\'upload des solutions: ' + error.message);
    } finally {
      setUploadingSolution(false);
      // Reset l'input file
      e.target.value = '';
    }
  };

  // Supprimer une solution PDF
  const handleDeleteSolution = async (solutionFile) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette solution PDF ?')) {
      return;
    }

    try {
      const pathToDelete = typeof solutionFile === 'string' ? solutionFile : solutionFile.path;
      await uploadService.deleteSolution(pathToDelete);
      setFormData(prev => ({
        ...prev,
        solutionFiles: (prev.solutionFiles || []).filter(file => {
          const filePath = typeof file === 'string' ? file : file.path;
          return filePath !== pathToDelete;
        })
      }));
      console.log('Solution PDF supprimée');
    } catch (error) {
      console.error('Erreur suppression solution:', error);
      alert('Erreur lors de la suppression de la solution');
    }
  };

  // Ajouter un lien de solution
  const handleAddSolutionLink = () => {
    if (!newSolutionLink.trim()) return;
    
    setFormData(prev => ({
      ...prev,
      solutionLinks: [...(prev.solutionLinks || []), newSolutionLink.trim()]
    }));
    setNewSolutionLink('');
  };

  // Supprimer un lien de solution
  const handleDeleteSolutionLink = (linkToDelete) => {
    setFormData(prev => ({
      ...prev,
      solutionLinks: (prev.solutionLinks || []).filter(link => link !== linkToDelete)
    }));
  };

  // Renommer une solution PDF
  const handleRenameSolution = (index, newName) => {
    setFormData(prev => ({
      ...prev,
      solutionFiles: (prev.solutionFiles || []).map((file, i) => {
        if (i === index) {
          return typeof file === 'string' 
            ? { path: file, name: newName }
            : { ...file, name: newName };
        }
        return file;
      })
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const dataToSave = {
        ...formData,
        // S'assurer que les tableaux existent
        solutionLinks: formData.solutionLinks || [],
        solutionFiles: formData.solutionFiles || []
      };

      if (isEditMode) {
        await updateCube(id, dataToSave);
      } else {
        await addCube(dataToSave);
      }

      navigate('/admin');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      // Optionnel: afficher un message d'erreur à l'utilisateur
      alert('Erreur lors de la sauvegarde. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/admin')}
            className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors"
          >
            <span>⬅️</span>
            <span>Retour à l'administration</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditMode ? 'Modifier le cube' : 'Ajouter un nouveau cube'}
          </h1>
          <p className="text-gray-600 mt-1">
            {isEditMode 
              ? 'Modifiez les informations du cube' 
              : 'Remplissez les informations du nouveau cube'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informations de base */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Nom du cube *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                value={formData.name}
                onChange={handleInputChange}
                className="input-field"
                placeholder="Ex: Rubik's Cube 3x3 Classique"
              />
            </div>

            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">
                Type *
              </label>
              <input
                type="text"
                id="type"
                name="type"
                required
                value={formData.type}
                onChange={handleInputChange}
                className="input-field"
                placeholder="Ex: 3x3, 4x4, Pyraminx, Megaminx"
              />
            </div>

            <div>
              <label htmlFor="brand" className="block text-sm font-medium text-gray-700 mb-2">
                Marque
                <span className="text-gray-500 text-xs ml-1">(optionnel)</span>
              </label>
              <input
                type="text"
                id="brand"
                name="brand"
                value={formData.brand}
                onChange={handleInputChange}
                className="input-field"
                placeholder="Ex: Rubik's, QiYi, GAN, MoYu"
              />
            </div>

            <div>
              <label htmlFor="dateObtained" className="block text-sm font-medium text-gray-700 mb-2">
                Date d'obtention
                <span className="text-gray-500 text-xs ml-1">(optionnel)</span>
              </label>
              <input
                type="date"
                id="dateObtained"
                name="dateObtained"
                value={formData.dateObtained}
                onChange={handleInputChange}
                className="input-field"
              />
            </div>

            <div>
              <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700 mb-2">
                Difficulté
                <span className="text-gray-500 text-xs ml-1">(optionnel)</span>
              </label>
              <select
                id="difficulty"
                name="difficulty"
                value={formData.difficulty}
                onChange={handleInputChange}
                className="input-field"
              >
                <option value="">Sélectionner une difficulté</option>
                <option value="Débutant">Débutant</option>
                <option value="Intermédiaire">Intermédiaire</option>
                <option value="Avancé">Avancé</option>
                <option value="Expert">Expert</option>
              </select>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="solved"
                name="solved"
                checked={formData.solved}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="solved" className="ml-2 block text-sm text-gray-900">
                Cube résolu
              </label>
            </div>
          </div>

          {/* Performances */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Performances
              <span className="text-gray-500 text-xs ml-1">(optionnel)</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="personalBest" className="block text-sm font-medium text-gray-700 mb-2">
                  Meilleur temps
                  <span className="text-gray-500 text-xs ml-1">(format: min:sec, ex: 2:45)</span>
                </label>
                <input
                  type="text"
                  id="personalBest"
                  name="personalBest"
                  value={formData.personalBest}
                  onChange={(e) => handleTimeChange(e, 'personalBest')}
                  onBlur={(e) => handleTimeBlur(e, 'personalBest')}
                  className="input-field"
                  placeholder="Ex: 2:45, 1:20, 0:45"
                />
              </div>

              <div>
                <label htmlFor="averageTime" className="block text-sm font-medium text-gray-700 mb-2">
                  Temps moyen
                  <span className="text-gray-500 text-xs ml-1">(format: min:sec, ex: 3:20)</span>
                </label>
                <input
                  type="text"
                  id="averageTime"
                  name="averageTime"
                  value={formData.averageTime}
                  onChange={(e) => handleTimeChange(e, 'averageTime')}
                  onBlur={(e) => handleTimeBlur(e, 'averageTime')}
                  className="input-field"
                  placeholder="Ex: 3:20, 1:45, 1:30"
                />
              </div>
            </div>
          </div>

          {/* Images */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Images
              <span className="text-gray-500 text-xs ml-1">(optionnel)</span>
            </h3>
            
            {/* Upload d'images */}
            <div className="mb-6">
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 hover:border-gray-400 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    {uploadingImages ? (
                      <>
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                        <p className="text-sm text-blue-600 font-medium">Upload en cours...</p>
                      </>
                    ) : (
                      <>
                        <span className="text-3xl mb-2">📷</span>
                        <p className="mb-2 text-sm text-gray-500">
                          <span className="font-semibold">Cliquez pour importer</span> ou glissez-déposez
                        </p>
                        <p className="text-xs text-gray-500">PNG, JPG, GIF, WebP (max 10MB par image)</p>
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploadingImages}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Galerie d'images */}
            {formData.images && formData.images.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Images ajoutées ({formData.images.length})
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {formData.images.map((image, index) => (
                    <div key={index} className="relative group">
                      <div className="aspect-square w-full overflow-hidden rounded-lg border-2 border-gray-200 bg-gray-100">
                        <img
                          src={image.startsWith('/') ? `http://localhost:3001${image}` : image}
                          alt={`Image ${index + 1}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIG5vbiBkaXNwb25pYmxlPC90ZXh0Pjwvc3ZnPg==';
                            e.target.alt = 'Image non disponible';
                          }}
                        />
                      </div>
                      {/* Bouton de suppression */}
                      <button
                        type="button"
                        onClick={() => handleImageDelete(index, image)}
                        className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg"
                        title="Supprimer cette image"
                      >
                        ✕
                      </button>
                      {/* Numéro de l'image */}
                      <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                        {index + 1}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  Survolez une image et cliquez sur ✕ pour la supprimer
                </p>
              </div>
            )}
          </div>

          {/* Solutions */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Solutions
              <span className="text-gray-500 text-xs ml-1">(optionnel)</span>
            </h3>
            
            {/* Liens de solutions */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Liens de solutions
                </label>
                <div className="flex items-center space-x-3 mb-3">
                  <input
                    type="url"
                    value={newSolutionLink}
                    onChange={(e) => setNewSolutionLink(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSolutionLink())}
                    className="input-field flex-1"
                    placeholder="https://ruwix.com/..."
                  />
                  <button
                    type="button"
                    onClick={handleAddSolutionLink}
                    disabled={!newSolutionLink.trim()}
                    className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Ajouter
                  </button>
                </div>
                
                {/* Liste des liens existants */}
                {formData.solutionLinks && formData.solutionLinks.length > 0 && (
                  <div className="space-y-2">
                    {formData.solutionLinks.map((link, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <span className="text-blue-600">🔗</span>
                          <a
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm underline break-all"
                          >
                            {link}
                          </a>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteSolutionLink(link)}
                          className="text-red-600 hover:text-red-800 text-sm p-1 rounded hover:bg-red-50"
                          title="Supprimer ce lien"
                        >
                          ❌
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Fichiers PDF de solutions */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fichiers PDF de solutions
                </label>
                <div className="flex items-center space-x-3 mb-3">
                  <input
                    type="file"
                    multiple
                    accept=".pdf,application/pdf"
                    onChange={handleSolutionUpload}
                    disabled={uploadingSolution}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100 disabled:opacity-50"
                  />
                  {uploadingSolution && (
                    <div className="flex items-center space-x-2 text-green-600">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                      <span className="text-sm">Upload...</span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mb-3">
                  Formats acceptés: PDF (max 10MB par fichier)
                </p>

                {/* Galerie des PDFs */}
                {formData.solutionFiles && formData.solutionFiles.length > 0 && (
                  <div className="space-y-2">
                    {formData.solutionFiles.map((file, index) => {
                      const fileObj = typeof file === 'string' ? { path: file, name: file.split('/').pop().replace(/\.[^/.]+$/, '') } : file;
                      return (
                        <div key={index} className="p-3 bg-green-50 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <span className="text-green-600">📄</span>
                              <a
                                href={fileObj.path.startsWith('/') ? `http://localhost:3001${fileObj.path}` : fileObj.path}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-green-600 hover:text-green-800 text-sm underline"
                              >
                                Voir le PDF
                              </a>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteSolution(fileObj)}
                              className="text-red-600 hover:text-red-800 text-sm p-1 rounded hover:bg-red-50"
                              title="Supprimer ce PDF"
                            >
                              ❌
                            </button>
                          </div>
                          <div className="flex items-center space-x-2">
                            <label className="text-xs text-gray-600 font-medium">Nom:</label>
                            <input
                              type="text"
                              value={fileObj.name}
                              onChange={(e) => handleRenameSolution(index, e.target.value)}
                              className="flex-1 text-sm p-1 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500"
                              placeholder="Nom de la solution"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Tags
              <span className="text-gray-500 text-xs ml-1">(optionnel)</span>
            </h3>
            <div className="space-y-4">
              {/* Tags existants sélectionnables */}
              {availableTags.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tags existants
                  </label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {availableTags
                      .filter(tag => !formData.tags.includes(tag))
                      .map((tag, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => handleAddTag(tag)}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700 hover:bg-blue-100 hover:text-blue-800 transition-colors"
                        >
                          <span>➕</span>
                          <span className="ml-1">{tag}</span>
                        </button>
                      ))
                    }
                  </div>
                </div>
              )}

              {/* Ajouter un nouveau tag */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ajouter un nouveau tag
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => {
                      setTagInput(e.target.value);
                      setShowTagSuggestions(e.target.value.length > 0);
                    }}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                    onFocus={() => setShowTagSuggestions(tagInput.length > 0)}
                    onBlur={() => setTimeout(() => setShowTagSuggestions(false), 200)}
                    className="input-field flex-1"
                    placeholder="Nom du tag"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddTag()}
                    disabled={!tagInput.trim()}
                    className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Ajouter
                  </button>
                </div>
                
                {/* Suggestions de tags */}
                {showTagSuggestions && filteredTags.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {filteredTags.map((tag, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleAddTag(tag)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Tags sélectionnés */}
              {formData.tags.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tags sélectionnés
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="ml-2 text-blue-600 hover:text-blue-800"
                        >
                          <span className="text-xs">❌</span>
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="border-t pt-6">
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
              Notes
              <span className="text-gray-500 text-xs ml-1">(optionnel)</span>
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={4}
              value={formData.notes}
              onChange={handleInputChange}
              className="input-field"
              placeholder="Ajoutez vos observations, commentaires ou anecdotes sur ce cube..."
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-4 pt-6 border-t">
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="btn-secondary"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary flex items-center space-x-2"
            >
              {isSubmitting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <span>💾</span>
              )}
              <span>
                {isSubmitting 
                  ? 'Sauvegarde...' 
                  : isEditMode 
                    ? 'Mettre à jour' 
                    : 'Ajouter le cube'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CubeForm;
