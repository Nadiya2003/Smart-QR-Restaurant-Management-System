import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../utils/api';

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchProfile = async () => {
    try {
      const data = await api.get('/auth/profile');
      setUser(data.user);
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const data = await api.post('/auth/login', { email, password });
      // REGISTERED PORTAL: set token, clear all guest-only storage
      localStorage.setItem('token', data.token);
      localStorage.removeItem('activeOrderId');  // Will be re-fetched from server
      localStorage.removeItem('guestSession');   // Clear any guest session flag
      setUser(data.user);
      return data;
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('activeOrderId'); // Clear session tracking to allow landing on Welcome
    localStorage.removeItem('guestSession');
    setUser(null);
  };

  // Guest portal entry — marks a pure guest session to prevent data bleed
  const enterAsGuest = () => {
    localStorage.removeItem('token');     // Ensure not logged in
    localStorage.removeItem('activeOrderId'); // Fresh guest order
    localStorage.setItem('guestSession', '1');
  };

  const register = async (userData) => {
    try {
      // Note: backend register might expect FormData if profile image is included
      // But for simple registration we can send JSON
      const data = await api.post('/auth/register', userData);
      localStorage.setItem('token', data.token);
      setUser(data.user);
      return data;
    } catch (error) {
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, loading, login, logout, register, enterAsGuest }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
