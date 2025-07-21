// Service pour communiquer avec l'API des cubes
const API_BASE_URL = '/api';

class CubesService {
  // Récupérer tous les cubes
  async getAllCubes() {
    try {
      const response = await fetch(`${API_BASE_URL}/cubes`);
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des cubes');
      }
      return await response.json();
    } catch (error) {
      console.error('Erreur API getAllCubes:', error);
      throw error;
    }
  }

  // Récupérer un cube par ID
  async getCubeById(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/cubes/${id}`);
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error('Erreur lors de la récupération du cube');
      }
      return await response.json();
    } catch (error) {
      console.error('Erreur API getCubeById:', error);
      throw error;
    }
  }

  // Ajouter un nouveau cube
  async addCube(cubeData) {
    try {
      const response = await fetch(`${API_BASE_URL}/cubes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cubeData),
      });
      if (!response.ok) {
        throw new Error('Erreur lors de l\'ajout du cube');
      }
      return await response.json();
    } catch (error) {
      console.error('Erreur API addCube:', error);
      throw error;
    }
  }

  // Modifier un cube existant
  async updateCube(id, cubeData) {
    try {
      const response = await fetch(`${API_BASE_URL}/cubes/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cubeData),
      });
      if (!response.ok) {
        throw new Error('Erreur lors de la modification du cube');
      }
      return await response.json();
    } catch (error) {
      console.error('Erreur API updateCube:', error);
      throw error;
    }
  }

  // Supprimer un cube
  async deleteCube(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/cubes/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Erreur lors de la suppression du cube');
      }
      return await response.json();
    } catch (error) {
      console.error('Erreur API deleteCube:', error);
      throw error;
    }
  }
}

export default new CubesService();
