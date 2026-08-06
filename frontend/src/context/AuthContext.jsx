import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Bersihkan sisa token versi lama jika ada
    localStorage.removeItem('token');
    
    // Dengan HttpOnly Cookie, token tidak bisa dibaca via JS.
    // Kita simpan user profil dasar di localStorage agar UI tidak berkedip
    const storedUser = localStorage.getItem('user_profile');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (err) {
        localStorage.removeItem('user_profile');
      }
    }
    setLoading(false);
  }, []);

  const login = (userData) => {
    localStorage.setItem('user_profile', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = async () => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
      await axios.post(`${API_URL}/logout`);
    } catch (err) {
      console.log('Logout error', err);
    }
    localStorage.removeItem('user_profile');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
