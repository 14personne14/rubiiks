import React from 'react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-50 border-t border-gray-200 mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Logo et description */}
          <div className="col-span-1">
            <div className="flex items-center space-x-2 mb-4">
              <span className="text-2xl">🧩</span>
              <h3 className="text-lg font-semibold text-gray-900">Rubiiks</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Ma collection de Rubik's cubes et casse-têtes, organisée et accessible.
            </p>
            <div className="flex space-x-4">
              <a 
                href="https://github.com" 
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title="GitHub"
              >
                <span className="text-xl">🔗</span>
              </a>
            </div>
          </div>

          {/* Liens rapides */}
          <div className="col-span-1">
            <h4 className="text-sm font-semibold text-gray-900 mb-4">Navigation</h4>
            <ul className="space-y-2">
              <li>
                <a href="/" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                  Accueil
                </a>
              </li>
              <li>
                <a href="/login" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                  Administration
                </a>
              </li>
            </ul>
          </div>

          {/* Informations */}
          <div className="col-span-1">
            <h4 className="text-sm font-semibold text-gray-900 mb-4">Informations</h4>
            <ul className="space-y-2">
              <li className="text-sm text-gray-600">
                Version 1.0.0
              </li>
              <li className="text-sm text-gray-600">
                React + Express.js
              </li>
              <li className="text-sm text-gray-600">
                Sécurisé
              </li>
            </ul>
          </div>
        </div>

        {/* Séparateur */}
        <div className="border-t border-gray-200 mt-8 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            {/* Copyright */}
            <div className="text-sm text-gray-500">
              © {currentYear} Rubiiks. Fait avec ❤️ pour les casse-têtes.
            </div>

            {/* Mention IA */}
            <div className="flex items-center space-x-2 bg-blue-50 text-blue-700 px-3 py-2 rounded-lg text-xs">
              <span className="text-sm">🤖</span>
              <span className="font-medium">Développé avec l'assistance de l'IA</span>
              <div className="group relative">
                <span className="cursor-help underline decoration-dotted">ℹ️</span>
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                  <div className="text-center">
                    <strong>Intelligence Artificielle</strong><br/>
                    Cette application a été développée avec l'assistance de GitHub Copilot pour accélérer le développement et améliorer la qualité du code.
                  </div>
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
