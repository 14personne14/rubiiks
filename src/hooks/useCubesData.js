import { useState, useEffect } from 'react';
import cubesService from '../services/cubesService';
import { uploadService } from '../services/uploadService';

// Hook personnalisé pour gérer les données des cubes via API
export const useCubesData = () => {
  const [cubes, setCubes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Chargement des données depuis l'API
  useEffect(() => {
    loadCubes();
  }, []);

  const loadCubes = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const cubesData = await cubesService.getAllCubes();
      setCubes(cubesData);
    } catch (err) {
      setError(err.message);
      console.error('Erreur lors du chargement des cubes:', err);
      // En cas d'erreur, garder les données existantes si possible
    } finally {
      setIsLoading(false);
    }
  };

  // Ajouter un nouveau cube
  const addCube = async (cubeData) => {
    try {
      const newCube = await cubesService.addCube(cubeData);
      
      // Plus besoin de renommage, les images sont déjà nommées correctement
      setCubes(prev => [...prev, newCube]);
      return newCube;
    } catch (err) {
      setError(err.message);
      console.error('Erreur lors de l\'ajout du cube:', err);
      throw err;
    }
  };

  // Modifier un cube existant
  const updateCube = async (cubeId, updates) => {
    try {
      const updatedCube = await cubesService.updateCube(cubeId, updates);
      setCubes(prev => prev.map(cube => 
        cube.id === cubeId ? updatedCube : cube
      ));
      return updatedCube;
    } catch (err) {
      setError(err.message);
      console.error('Erreur lors de la modification du cube:', err);
      throw err;
    }
  };

  // Supprimer un cube
  const deleteCube = async (cubeId) => {
    try {
      await cubesService.deleteCube(cubeId);
      setCubes(prev => prev.filter(cube => cube.id !== cubeId));
    } catch (err) {
      setError(err.message);
      console.error('Erreur lors de la suppression du cube:', err);
      throw err;
    }
  };

  // Obtenir un cube par son ID
  const getCubeById = (cubeId) => {
    return cubes.find(cube => cube.id === cubeId);
  };

  // Rafraîchir les données
  const refreshCubes = () => {
    loadCubes();
  };

  return {
    cubes,
    isLoading,
    error,
    addCube,
    updateCube,
    deleteCube,
    getCubeById,
    refreshCubes
  };
};
