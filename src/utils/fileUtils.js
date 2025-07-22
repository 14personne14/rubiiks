/**
 * Utilitaires pour la gestion des chemins de fichiers
 */

/**
 * Construit l'URL complète d'une image à partir du nom de fichier et de l'ID du cube
 * @param {string} filename - Nom du fichier (ex: "main.jpg")
 * @param {string} cubeId - ID du cube
 * @returns {string} URL complète de l'image
 */
export const buildImageUrl = (filename, cubeId) => {
  if (!filename || !cubeId) return null;
  return `/cubes/cube-${cubeId}/images/${filename}`;
};

/**
 * Construit l'URL complète d'une solution à partir du nom de fichier et de l'ID du cube
 * @param {string} filename - Nom du fichier (ex: "method-beginner.pdf")
 * @param {string} cubeId - ID du cube
 * @returns {string} URL complète de la solution
 */
export const buildSolutionUrl = (filename, cubeId) => {
  if (!filename || !cubeId) return null;
  return `/cubes/cube-${cubeId}/solutions/${filename}`;
};

/**
 * Récupère la première image d'un cube avec l'URL complète
 * @param {Object} cube - Objet cube avec files.images ou images (ancien format)
 * @returns {string|null} URL de la première image ou null
 */
export const getFirstImageUrl = (cube) => {
  // Nouvelle structure avec files.images
  if (cube?.files?.images?.length) {
    return buildImageUrl(cube.files.images[0], cube.id);
  }
  
  // Ancienne structure avec images (URLs complètes)
  if (cube?.images?.length) {
    const firstImage = cube.images[0];
    // Si c'est déjà une URL complète, la retourner telle quelle
    if (firstImage.startsWith('/') || firstImage.startsWith('http')) {
      return firstImage;
    }
    // Sinon, construire l'URL
    return buildImageUrl(firstImage, cube.id);
  }
  
  return null;
};

/**
 * Récupère toutes les URLs d'images d'un cube
 * @param {Object} cube - Objet cube avec files.images ou images (ancien format)
 * @returns {string[]} Array des URLs d'images
 */
export const getAllImageUrls = (cube) => {
  // Nouvelle structure avec files.images
  if (cube?.files?.images?.length) {
    return cube.files.images.map(filename => buildImageUrl(filename, cube.id));
  }
  
  // Ancienne structure avec images (URLs complètes)
  if (cube?.images?.length) {
    return cube.images.map(image => {
      // Si c'est déjà une URL complète, la retourner telle quelle
      if (image.startsWith('/') || image.startsWith('http')) {
        return image;
      }
      // Sinon, construire l'URL
      return buildImageUrl(image, cube.id);
    });
  }
  
  return [];
};

/**
 * Récupère toutes les URLs de solutions d'un cube
 * @param {Object} cube - Objet cube avec files.solutions
 * @returns {Object[]} Array des objets solution avec URLs
 */
export const getAllSolutionUrls = (cube) => {
  if (!cube?.files?.solutions?.length) return [];
  return cube.files.solutions.map(solution => ({
    ...solution,
    url: buildSolutionUrl(solution.filename, cube.id)
  }));
};
