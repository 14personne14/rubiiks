import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useCubesData } from '../hooks/useCubesData';
import { useAuth } from '../contexts/AuthContext';
import CubeCard from '../components/CubeCard';

const Home = () => {
  const { cubes, isLoading, deleteCube } = useCubesData();
  const { isAdmin } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('');
  const [filterSolved, setFilterSolved] = useState('');
  const [sortBy, setSortBy] = useState('dateObtained');
  const [viewMode, setViewMode] = useState('grid');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [cubeToDelete, setCubeToDelete] = useState(null);

  // Filtrage et tri des cubes
  const filteredAndSortedCubes = useMemo(() => {
    let filtered = cubes.filter(cube => {
      if (!searchTerm) return true;
      
      const searchLower = searchTerm.toLowerCase();
      
      // Recherche dans le nom
      const matchesName = cube.name?.toLowerCase().includes(searchLower);
      
      // Recherche dans le type
      const matchesType = cube.type?.toLowerCase().includes(searchLower);
      
      // Recherche dans la marque
      const matchesBrand = cube.brand?.toLowerCase().includes(searchLower);
      
      // Recherche dans les tags
      const matchesTags = cube.tags?.some(tag => 
        tag.toLowerCase().includes(searchLower)
      );
      
      // Recherche dans la date d'obtention (format lisible)
      const matchesDate = cube.dateObtained && (
        cube.dateObtained.includes(searchTerm) || // Format ISO (2024-01-15)
        new Date(cube.dateObtained).toLocaleDateString('fr-FR').includes(searchTerm) || // Format français (15/01/2024)
        new Date(cube.dateObtained).toLocaleDateString('fr-FR', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }).toLowerCase().includes(searchLower) // Format long (15 janvier 2024)
      );
      
      // Recherche dans les notes
      const matchesNotes = cube.notes?.toLowerCase().includes(searchLower);
      
      // Recherche dans la difficulté
      const matchesDifficulty = cube.difficulty?.toLowerCase().includes(searchLower);
      
      const matchesSearch = matchesName || matchesType || matchesBrand || 
                           matchesTags || matchesDate || matchesNotes || matchesDifficulty;
      
      const matchesDifficultyFilter = !filterDifficulty || cube.difficulty === filterDifficulty;
      const matchesSolved = filterSolved === '' || 
                           (filterSolved === 'true' && cube.solved) ||
                           (filterSolved === 'false' && !cube.solved);

      return matchesSearch && matchesDifficultyFilter && matchesSolved;
    });

    // Tri
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'dateObtained':
          return new Date(b.dateObtained) - new Date(a.dateObtained);
        case 'difficulty':
          const difficultyOrder = { 'Débutant': 1, 'Intermédiaire': 2, 'Avancé': 3, 'Expert': 4 };
          return (difficultyOrder[a.difficulty] || 5) - (difficultyOrder[b.difficulty] || 5);
        case 'personalBest':
          if (!a.personalBest) return 1;
          if (!b.personalBest) return -1;
          return a.personalBest.localeCompare(b.personalBest);
        default:
          return 0;
      }
    });

    return filtered;
  }, [cubes, searchTerm, filterDifficulty, filterSolved, sortBy]);

  const difficulties = [...new Set(cubes.map(cube => cube.difficulty).filter(Boolean))];

  const handleDeleteClick = (cube) => {
    setCubeToDelete(cube);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (cubeToDelete) {
      deleteCube(cubeToDelete.id);
      setShowDeleteModal(false);
      setCubeToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="text-center flex-1">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Ma Collection de Rubik's Cubes
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Découvrez ma collection de {cubes.length} casse-têtes avec leurs solutions et statistiques
          </p>
        </div>
        
        {/* Bouton d'ajout pour admin */}
        {isAdmin && (
          <Link
            to="/admin/add"
            className="btn-primary flex items-center space-x-2 ml-4"
          >
            <span>➕</span>
            <span>Ajouter</span>
          </Link>
        )}
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="text-2xl font-bold text-blue-600 mb-1">
            {cubes.length}
          </div>
          <div className="text-sm text-gray-600">Total des cubes</div>
        </div>
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="text-2xl font-bold text-green-600 mb-1">
            {cubes.filter(cube => cube.solved).length}
          </div>
          <div className="text-sm text-gray-600">Résolus</div>
        </div>
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="text-2xl font-bold text-orange-600 mb-1">
            {cubes.filter(cube => !cube.solved).length}
          </div>
          <div className="text-sm text-gray-600">En cours</div>
        </div>
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="text-2xl font-bold text-blue-600 mb-1">
            {difficulties.length}
          </div>
          <div className="text-sm text-gray-600">Niveaux</div>
        </div>
      </div>

      {/* Filtres et recherche */}
      <div className="bg-white rounded-lg p-6 shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
          {/* Recherche */}
          <div className="lg:col-span-2">
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">🔍</span>
              <input
                type="text"
                placeholder="Rechercher par nom, type, marque, tags, date..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
              />
            </div>
          </div>

          {/* Filtre par difficulté */}
          <select
            value={filterDifficulty}
            onChange={(e) => setFilterDifficulty(e.target.value)}
            className="input-field"
          >
            <option value="">Toutes difficultés</option>
            {difficulties.map(difficulty => (
              <option key={difficulty} value={difficulty}>{difficulty}</option>
            ))}
          </select>

          {/* Filtre par statut */}
          <select
            value={filterSolved}
            onChange={(e) => setFilterSolved(e.target.value)}
            className="input-field"
          >
            <option value="">Tous statuts</option>
            <option value="true">Résolus</option>
            <option value="false">En cours</option>
          </select>

          {/* Tri */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="input-field"
          >
            <option value="dateObtained">Date d'obtention</option>
            <option value="name">Nom</option>
            <option value="difficulty">Difficulté</option>
            <option value="personalBest">Meilleur temps</option>
          </select>
        </div>

        {/* Mode d'affichage */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {filteredAndSortedCubes.length} cube(s) affiché(s)
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <span className="text-xl">⊞</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <span className="text-xl">☰</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grille des cubes */}
      {filteredAndSortedCubes.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Aucun cube trouvé
          </h3>
          <p className="text-gray-600">
            Essayez de modifier vos critères de recherche ou filtres.
          </p>
        </div>
      ) : (
        <div className={`grid gap-6 ${
          viewMode === 'grid' 
            ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
            : 'grid-cols-1'
        }`}>
          {filteredAndSortedCubes.map(cube => (
            <CubeCard 
              key={cube.id} 
              cube={cube} 
              viewMode={viewMode}
              onDelete={handleDeleteClick}
            />
          ))}
        </div>
      )}

      {/* Modal de confirmation de suppression */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <span className="text-2xl">🗑️</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mt-4">
                Supprimer le cube
              </h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  Êtes-vous sûr de vouloir supprimer <strong>{cubeToDelete?.name}</strong> ?
                  Cette action est irréversible.
                </p>
              </div>
              <div className="flex items-center justify-center space-x-4 mt-4">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="btn-secondary"
                >
                  Annuler
                </button>
                <button
                  onClick={confirmDelete}
                  className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
