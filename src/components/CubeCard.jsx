import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getFirstImageUrl } from '../utils/fileUtils';

const CubeCard = ({ cube, onDelete, viewMode = 'grid' }) => {
	const { isAdmin } = useAuth();

	const formatDate = (dateString) => {
		return new Date(dateString).toLocaleDateString('fr-FR', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
		});
	};

	const getDifficultyColor = (difficulty) => {
		switch (difficulty?.toLowerCase()) {
			case 'débutant':
				return 'bg-green-100 text-green-800';
			case 'intermédiaire':
				return 'bg-yellow-100 text-yellow-800';
			case 'avancé':
				return 'bg-orange-100 text-orange-800';
			case 'expert':
				return 'bg-red-100 text-red-800';
			default:
				return 'bg-gray-100 text-gray-800';
		}
	};

	// Fonction pour déterminer les types de solutions disponibles
	const getSolutionTags = () => {
		const tags = [];

		// Nouveau format avec files.solutions
		if (cube.files?.solutions && cube.files.solutions.length > 0) {
			tags.push({ text: 'PDF', color: 'bg-green-100 text-green-800', icon: '📄' });
		}

		// Liens externes
		if (cube.externalLinks && cube.externalLinks.length > 0) {
			tags.push({ text: 'Web', color: 'bg-blue-100 text-blue-800', icon: '🌐' });
		}

		// Anciens formats pour compatibilité
		if (cube.solutionLinks && cube.solutionLinks.length > 0) {
			tags.push({ text: 'Web', color: 'bg-blue-100 text-blue-800', icon: '🌐' });
		}
		if (cube.solutionFiles && cube.solutionFiles.length > 0) {
			tags.push({ text: 'PDF', color: 'bg-green-100 text-green-800', icon: '📄' });
		}

		// Ancien format pour compatibilité
		if (!tags.length && cube.solutionLink) {
			if (cube.solutionType === 'pdf') {
				tags.push({ text: 'PDF', color: 'bg-green-100 text-green-800', icon: '📄' });
			} else {
				tags.push({ text: 'Web', color: 'bg-blue-100 text-blue-800', icon: '🌐' });
			}
		}

		return tags;
	};

	const handleDeleteClick = (e) => {
		e.preventDefault();
		e.stopPropagation();
		if (onDelete) {
			onDelete(cube);
		}
	};

	// Mode liste (compact)
	if (viewMode === 'list') {
		return (
			<div className='bg-white rounded-lg shadow-sm border hover:shadow-lg transition-shadow duration-300'>
				<div className='p-4'>
					<div className='flex items-center justify-between'>
						{/* Contenu cliquable */}
						<Link to={`/cube/${cube.id}`} className='flex items-center flex-1 group'>
							<div className='flex-shrink-0 h-16 w-16 mr-4'>
								{getFirstImageUrl(cube) ? (
									<img
										className='h-16 w-16 rounded-lg object-cover'
										src={getFirstImageUrl(cube)}
										alt={cube.name}
										onError={(e) => {
											e.target.style.display = 'none';
											e.target.nextElementSibling.style.display = 'flex';
										}}
									/>
								) : null}
								<div
									className='h-16 w-16 rounded-lg bg-gradient-to-br from-primary-100 to-secondary-100 flex items-center justify-center'
									style={{ display: getFirstImageUrl(cube) ? 'none' : 'flex' }}>
									<span className='text-2xl'>🧩</span>
								</div>
							</div>

							<div className='flex-1 min-w-0'>
								<div className='flex items-start justify-between'>
									<div className='flex-1'>
										<h3 className='text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors'>
											{cube.name || 'Cube sans nom'}
										</h3>
										<div className='flex items-center space-x-4 mt-1'>
											{cube.type && <span className='text-sm text-gray-600'>{cube.type}</span>}
											{cube.difficulty && (
												<span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(cube.difficulty)}`}>
													{cube.difficulty}
												</span>
											)}
											{cube.dateObtained && <span className='text-sm text-gray-500'>{formatDate(cube.dateObtained)}</span>}
										</div>
									</div>

									<div className='flex items-center space-x-2 ml-4'>
										{/* Badge de statut */}
										{cube.solved ? (
											<span className='bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center'>
												<span className='mr-1'>⭐</span>
												Résolu
											</span>
										) : (
											<span className='bg-orange-500 text-white px-2 py-1 rounded-full text-xs font-medium'>En cours</span>
										)}

										{/* Indicateurs de solution */}
										{getSolutionTags().map((solutionTag, index) => (
											<span
												key={index}
												className={`px-2 py-1 text-xs rounded-md font-medium flex items-center space-x-1 ${solutionTag.color}`}
												title={`Solution ${solutionTag.text} disponible`}>
												<span>{solutionTag.icon}</span>
												<span>{solutionTag.text}</span>
											</span>
										))}
									</div>
								</div>
							</div>
						</Link>

						{/* Boutons admin séparés */}
						{isAdmin && (
							<div className='flex items-center space-x-2 ml-4'>
								<Link
									to={`/admin/edit/${cube.id}`}
									className='text-gray-600 hover:text-blue-600 transition-colors p-2 rounded-md hover:bg-gray-100'
									title='Modifier'>
									<span>✏️</span>
								</Link>
								<button
									onClick={handleDeleteClick}
									className='text-gray-600 hover:text-red-600 transition-colors p-2 rounded-md hover:bg-red-50'
									title='Supprimer'>
									<span>🗑️</span>
								</button>
							</div>
						)}
					</div>
				</div>
			</div>
		);
	}

	// Mode grille (restructuré sans liens imbriqués)
	return (
		<div className='card p-0 overflow-hidden group hover:shadow-lg hover:scale-105 transition-all duration-300 relative'>
			{/* Boutons admin en position absolue */}
			{isAdmin && (
				<div className='absolute top-2 left-2 z-10 flex space-x-2'>
					<Link
						to={`/admin/edit/${cube.id}`}
						className='bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-600 hover:text-blue-600 transition-colors p-2 rounded-full shadow-sm'
						title='Modifier'>
						<span>✏️</span>
					</Link>
					<button
						onClick={handleDeleteClick}
						className='bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-600 hover:text-red-600 transition-colors p-2 rounded-full shadow-sm'
						title='Supprimer'>
						<span>🗑️</span>
					</button>
				</div>
			)}

			{/* Contenu cliquable */}
			<Link to={`/cube/${cube.id}`} className='block cursor-pointer'>
				{/* Image */}
				<div className='aspect-w-16 aspect-h-12 bg-gray-200 relative overflow-hidden'>
					{getFirstImageUrl(cube) ? (
						<img
							src={getFirstImageUrl(cube)}
							alt={cube.name}
							className='w-full h-48 object-cover'
							onError={(e) => {
								e.target.style.display = 'none';
								e.target.nextElementSibling.style.display = 'flex';
							}}
						/>
					) : null}
					<div
						className='w-full h-48 bg-gradient-to-br from-primary-100 to-secondary-100 flex items-center justify-center'
						style={{ display: getFirstImageUrl(cube) ? 'none' : 'flex' }}>
						<div className='text-center'>
							<div className='text-6xl mb-2'>🧩</div>
							<p className='text-gray-600 font-medium'>{cube.type || 'Cube'}</p>
						</div>
					</div>

					{/* Badges de statut et difficulté */}
					<div className='absolute top-3 right-3 flex flex-col gap-2 items-end'>
						{cube.solved ? (
							<span className='bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center'>
								<span className='mr-1'>⭐</span>
								Résolu
							</span>
						) : (
							<span className='bg-orange-500 text-white px-2 py-1 rounded-full text-xs font-medium'>En cours</span>
						)}

						{cube.difficulty && (
							<span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(cube.difficulty)}`}>
								{cube.difficulty}
							</span>
						)}
					</div>
				</div>

				{/* Contenu principal */}
				<div className='p-4'>
					{/* Nom du cube */}
					<h3 className='text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors'>
						{cube.name || 'Cube sans nom'}
					</h3>

					{/* Informations */}
					<div className='space-y-2 mb-4'>
						{cube.type && (
							<p className='text-sm text-gray-600'>
								<span className='font-medium'>Type :</span> {cube.type}
							</p>
						)}
						{cube.brand && (
							<p className='text-sm text-gray-600'>
								<span className='font-medium'>Marque :</span> {cube.brand}
							</p>
						)}
						{cube.personalBest && (
							<p className='text-sm text-gray-600'>
								<span className='font-medium'>Record :</span> {cube.personalBest}
							</p>
						)}
						{cube.dateObtained && (
							<p className='text-sm text-gray-500'>
								<span className='font-medium'>Obtenu le :</span> {formatDate(cube.dateObtained)}
							</p>
						)}
					</div>

					{/* Tags */}
					{cube.tags && cube.tags.length > 0 && (
						<div className='flex flex-wrap gap-1 mb-4'>
							{cube.tags.slice(0, 3).map((tag, index) => (
								<span key={index} className='px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md'>
									{tag}
								</span>
							))}
							{cube.tags.length > 3 && (
								<span className='px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md'>+{cube.tags.length - 3}</span>
							)}
						</div>
					)}

					{/* Indicateurs de solution */}
					{(cube.solutionLink ||
						(cube.solutionLinks && cube.solutionLinks.length > 0) ||
						(cube.solutionFiles && cube.solutionFiles.length > 0) ||
						(cube.files?.solutions && cube.files.solutions.length > 0) ||
						(cube.externalLinks && cube.externalLinks.length > 0)) && (
						<div className='flex items-center justify-between pt-4 border-t border-gray-100'>
							<div className='flex items-center text-sm text-gray-500'>
								<span className='mr-1'>💡</span>
								<span>Solutions</span>
							</div>

							{/* Indicateurs de type de solution */}
							<div className='flex gap-1'>
								{getSolutionTags().map((solutionTag, index) => (
									<span
										key={index}
										className={`px-2 py-1 text-xs rounded-md font-medium flex items-center space-x-1 ${solutionTag.color}`}
										title={`Solution ${solutionTag.text} disponible`}>
										<span>{solutionTag.icon}</span>
										<span>{solutionTag.text}</span>
									</span>
								))}
							</div>
						</div>
					)}
				</div>
			</Link>
		</div>
	);
};

export default CubeCard;
