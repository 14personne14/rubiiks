import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Vérifier si l'admin est déjà connecté
    const adminStatus = localStorage.getItem('rubiiks-admin');
    if (adminStatus === 'true') {
      setIsAdmin(true);
    }
    setIsLoading(false);
  }, []);

  // Écouter les changements du localStorage pour synchroniser entre onglets
  useEffect(() => {
    const handleStorageChange = () => {
      const adminStatus = localStorage.getItem('rubiiks-admin');
      setIsAdmin(adminStatus === 'true');
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const login = async (password) => {
    try {
      const response = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        setIsAdmin(true);
        localStorage.setItem('rubiiks-admin', 'true');
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('Erreur d\'authentification:', error);
      return false;
    }
  };

  const logout = () => {
    setIsAdmin(false);
    localStorage.removeItem('rubiiks-admin');
  };

  const value = {
    isAdmin,
    isLoading,
    login,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
