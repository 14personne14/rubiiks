const API_BASE_URL = 'http://localhost:3001/api';

export const uploadService = {
  // Upload d'images avec ID du cube pour le nommage
  async uploadImages(files, cubeId = null) {
    try {
      const formData = new FormData();
      
      // Ajouter tous les fichiers image
      Array.from(files).forEach(file => {
        formData.append('images', file);
      });

      // Ajouter l'ID du cube si fourni pour le nommage
      if (cubeId) {
        formData.append('cubeId', cubeId);
      }

      const response = await fetch(`${API_BASE_URL}/upload/images`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de l\'upload des images');
      }

      return await response.json();
    } catch (error) {
      console.error('Erreur upload images:', error);
      throw error;
    }
  },

  // Upload de solution PDF avec ID du cube pour le nommage
  async uploadSolution(file, cubeId = null) {
    try {
      const formData = new FormData();
      formData.append('solution', file);

      // Ajouter l'ID du cube si fourni pour le nommage
      if (cubeId) {
        formData.append('cubeId', cubeId);
      }

      const response = await fetch(`${API_BASE_URL}/upload/solution`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de l\'upload de la solution');
      }

      return await response.json();
    } catch (error) {
      console.error('Erreur upload solution:', error);
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
  },

  // Renommer les images temporaires avec l'ID réel du cube
  async renameImages(oldImages, newCubeId) {
    try {
      const response = await fetch(`${API_BASE_URL}/upload/rename-images`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ oldImages, newCubeId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors du renommage des images');
      }

      return await response.json();
    } catch (error) {
      console.error('Erreur renommage images:', error);
      throw error;
    }
  }
};
