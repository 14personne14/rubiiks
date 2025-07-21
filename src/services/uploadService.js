const API_BASE_URL = 'http://localhost:3001/api';

export const uploadService = {
  // Récupérer les informations des fichiers existants pour un cube
  async getCubeFiles(cubeId) {
    try {
      const response = await fetch(`${API_BASE_URL}/cubes/${cubeId}/files`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de la récupération des fichiers');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Erreur récupération fichiers cube:', error);
      throw error;
    }
  },

  // Upload d'images avec ID du cube pour le nommage
  async uploadImages(files, cubeId = null) {
    try {
      console.log('🔄 Upload de', files.length, 'image(s) avec cubeId:', cubeId);
      
      const formData = new FormData();
      
      // Ajouter l'ID du cube AVANT les fichiers pour que multer puisse l'utiliser
      if (cubeId) {
        formData.append('cubeId', cubeId);
      }
      
      // Ajouter tous les fichiers image
      Array.from(files).forEach(file => {
        formData.append('images', file);
      });

      const response = await fetch(`${API_BASE_URL}/upload/images`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de l\'upload des images');
      }

      const result = await response.json();
      console.log('✅ Réponse serveur upload images:', result);
      return result;
    } catch (error) {
      console.error('❌ Erreur upload images:', error);
      throw error;
    }
  },

  // Upload de solution PDF avec ID du cube pour le nommage
  async uploadSolution(file, cubeId = null, customName = null) {
    try {
      console.log('🔄 Upload PDF:', file.name, 'avec cubeId:', cubeId);
      
      const formData = new FormData();
      
      // Ajouter l'ID du cube AVANT le fichier
      if (cubeId) {
        formData.append('cubeId', cubeId);
      }
      
      // Ajouter le nom personnalisé si fourni
      if (customName) {
        formData.append('customName', customName);
      }
      
      formData.append('solution', file);

      const response = await fetch(`${API_BASE_URL}/upload/solution`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de l\'upload de la solution');
      }

      const result = await response.json();
      console.log('✅ Réponse serveur upload PDF:', result);
      return result;
    } catch (error) {
      console.error('❌ Erreur upload solution:', error);
      throw error;
    }
  },

  // Supprimer une image
  async deleteImage(imagePath) {
    try {
      const response = await fetch(`${API_BASE_URL}/upload/image`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imagePath }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de la suppression de l\'image');
      }

      return await response.json();
    } catch (error) {
      console.error('Erreur suppression image:', error);
      throw error;
    }
  },

  // Supprimer une solution PDF
  async deleteSolution(solutionPath) {
    try {
      const response = await fetch(`${API_BASE_URL}/upload/solution`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ solutionPath }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de la suppression de la solution');
      }

      return await response.json();
    } catch (error) {
      console.error('Erreur suppression solution:', error);
      throw error;
    }
  }
};
