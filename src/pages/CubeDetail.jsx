import React from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { useCubesData } from '../hooks/useCubesData';
import { useAuth } from '../contexts/AuthContext';

const CubeDetail = () => {
	const { id } = useParams();
	const { getCubeById } = useCubesData();
	const { isAdmin } = useAuth();

	const cube = getCubeById(id);

	if (!cube) {
		return (
			<div className='text-center py-12'>
				<div className='text-6xl mb-4'>❓</div>
				<h2 className='text-2xl font-bold text-gray-900 mb-4'>Cube introuvable</h2>
				<p className='text-gray-600 mb-6'>Le cube demandé n'existe pas ou a été supprimé.</p>
				<Link to='/' className='btn-primary'>
					Retour à l'accueil
				</Link>
			</div>
		);
	}

	return (
		<div className='max-w-4xl mx-auto'>
			{/* Header avec navigation */}
			<div className='flex items-center justify-between mb-6'>
				<Link to='/' className='flex items-center space-x-2 text-gray-600 hover:text-blue-600'>
					<span>⬅️</span>
					<span>Retour à la collection</span>
				</Link>

				{isAdmin && (
					<Link to={`/admin/edit/${cube.id}`} className='flex items-center space-x-2 btn-primary'>
						<span>✏️</span>
						<span>Modifier</span>
					</Link>
				)}
			</div>

			{/* Contenu principal */}
			<div className='bg-white rounded-lg shadow-lg overflow-hidden'>
				<div className='p-6'>
					{/* En-tête */}
					<div className='flex items-start justify-between mb-6'>
						<div>
							<h1 className='text-3xl font-bold text-gray-900 mb-2'>{cube.name || 'Cube sans nom'}</h1>
							<div className='flex items-center space-x-4 text-sm text-gray-600'>
								{cube.type && <span className='font-medium'>{cube.type}</span>}
								{cube.type && cube.brand && <span>•</span>}
								{cube.brand && <span>{cube.brand}</span>}
								{(cube.type || cube.brand) && cube.dateObtained && <span>•</span>}
								{cube.dateObtained && <span>Obtenu le {new Date(cube.dateObtained).toLocaleDateString('fr-FR')}</span>}
							</div>
						</div>

						<div className='flex flex-col items-end space-y-2'>
							{cube.difficulty && (
								<div className='inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800'>
									⭐ {cube.difficulty}
								</div>
							)}
							{cube.solved && (
								<div className='inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800'>
									✅ Résolu
								</div>
							)}
						</div>
					</div>

					{/* Images */}
					{cube.images && cube.images.length > 0 && (
						<div className='mb-6'>
							<h3 className='text-lg font-semibold mb-3 flex items-center'>
								<span className='mr-2'>🖼️</span>
								Images ({cube.images.length})
							</h3>
							<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
								{cube.images.map((image, index) => (
									<div key={index} className='aspect-square bg-gray-100 rounded-lg overflow-hidden'>
										<img
											src={image}
											alt={`${cube.name} - Image ${index + 1}`}
											className='w-full h-full object-cover'
											onError={(e) => {
												e.target.src = `/images/rubiks_cube_placeholder.jpg`;
											}}
										/>
									</div>
								))}
							</div>
						</div>
					)}

					{/* Informations et Solutions */}
					<div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
						{/* Colonne de gauche - Informations */}
						<div className='space-y-4'>
							<h3 className='text-lg font-semibold'>📋 Informations</h3>
							<div className='space-y-3'>
								{cube.dateObtained && (
									<div className='flex items-center'>
										<span className='mr-3'>📅</span>
										<div>
											<span className='text-sm text-gray-600'>Date d'obtention</span>
											<div className='font-medium'>{new Date(cube.dateObtained).toLocaleDateString('fr-FR')}</div>
										</div>
									</div>
								)}

								{cube.personalBest && (
									<div className='flex items-center'>
										<span className='mr-3'>⏱️</span>
										<div>
											<span className='text-sm text-gray-600'>Meilleur temps</span>
											<div className='font-medium'>{cube.personalBest}</div>
										</div>
									</div>
								)}

								{cube.averageTime && (
									<div className='flex items-center'>
										<span className='mr-3'>⏰</span>
										<div>
											<span className='text-sm text-gray-600'>Temps moyen</span>
											<div className='font-medium'>{cube.averageTime}</div>
										</div>
									</div>
								)}

								{cube.tags && cube.tags.length > 0 && (
									<div className='flex items-start'>
										<span className='mr-3 mt-1'>🏷️</span>
										<div>
											<span className='text-sm text-gray-600'>Tags</span>
											<div className='flex flex-wrap gap-1 mt-1'>
												{cube.tags.map((tag, index) => (
													<span key={index} className='px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md'>
														{tag}
													</span>
												))}
											</div>
										</div>
									</div>
								)}

								{/* Message si aucune information */}
								{!cube.dateObtained && !cube.personalBest && !cube.averageTime && (!cube.tags || cube.tags.length === 0) && (
									<div className='text-center py-6 text-gray-500'>
										<span className='text-4xl mb-2 block'>📋</span>
										<p>Aucune information supplémentaire</p>
									</div>
								)}
							</div>
						</div>

						{/* Colonne de droite - Solutions */}
						<div className='space-y-4'>
							<h3 className='text-lg font-semibold'>🧩 Solutions</h3>

							{/* Liens de solutions */}
							{cube.solutionLinks && cube.solutionLinks.length > 0 && (
								<div className='space-y-3'>
									<h4 className='font-medium text-gray-900'>🔗 Liens web</h4>
									{cube.solutionLinks.map((link, index) => (
										<a
											key={index}
											href={link}
											target='_blank'
											rel='noopener noreferrer'
											className='flex items-center space-x-3 p-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors'>
											<span className='text-2xl'>🌐</span>
											<div className='flex-1'>
												<div className='font-medium text-blue-900'>Voir la solution en ligne</div>
												<div className='text-sm text-blue-600 break-all'>{link}</div>
											</div>
										</a>
									))}
								</div>
							)}

							{/* Fichiers PDF de solutions */}
							{cube.solutionFiles && cube.solutionFiles.length > 0 && (
								<div className='space-y-3'>
									<h4 className='font-medium text-gray-900'>📄 Fichiers PDF</h4>
									{cube.solutionFiles.map((file, index) => {
										const fileObj =
											typeof file === 'string'
												? {
														path: file,
														name: file
															.split('/')
															.pop()
															.replace(/\.[^/.]+$/, ''),
												  }
												: file;
										return (
											<a
												key={index}
												href={fileObj.path.startsWith('/') ? `http://localhost:3001${fileObj.path}` : fileObj.path}
												target='_blank'
												rel='noopener noreferrer'
												className='flex items-center space-x-3 p-3 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg transition-colors'>
												<span className='text-2xl'>📄</span>
												<div className='flex-1'>
													<div className='font-medium text-green-900'>{fileObj.name}</div>
													<div className='text-sm text-green-600'>Document PDF</div>
												</div>
											</a>
										);
									})}
								</div>
							)}

							{/* Support de l'ancien format pour la compatibilité */}
							{cube.solutionLink && !cube.solutionLinks && !cube.solutionFiles && (
								<div className='space-y-3'>
									<a
										href={cube.solutionLink}
										target='_blank'
										rel='noopener noreferrer'
										className='inline-flex items-center space-x-2 p-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors'>
										<span className='text-2xl'>{cube.solutionType === 'pdf' ? '📄' : '🌐'}</span>
										<div>
											<div className='font-medium text-blue-900'>Voir la solution</div>
											<div className='text-sm text-blue-600'>{cube.solutionType === 'pdf' ? 'Document PDF' : 'Page web'}</div>
										</div>
									</a>
								</div>
							)}

							{/* Aucune solution */}
							{(!cube.solutionLinks || cube.solutionLinks.length === 0) &&
								(!cube.solutionFiles || cube.solutionFiles.length === 0) &&
								!cube.solutionLink && (
									<div className='text-center py-6 text-gray-500'>
										<span className='text-4xl mb-2 block'>🔍</span>
										<p>Aucune solution enregistrée</p>
									</div>
								)}
						</div>
					</div>

					{/* Notes */}
					{cube.notes && (
						<div className='mt-6 pt-6 border-t'>
							<h3 className='text-lg font-semibold mb-3'>📝 Notes</h3>
							<div className='bg-amber-50 border border-amber-200 rounded-lg p-4'>
								<p className='text-gray-700 whitespace-pre-wrap'>{cube.notes}</p>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default CubeDetail;
