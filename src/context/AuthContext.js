import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

// ✅ Base API URL from .env
const API_URL = process.env.REACT_APP_API_URL;

export function AuthProvider({ children }) {
  const [user, setUser]     = useState(null);
  const [token, setToken]   = useState(() => localStorage.getItem('mc_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      // ✅ UPDATED API URL
      axios.get(`${API_URL}/api/auth/me`)
        .then(r => setUser(r.data.user))
        .catch(() => logout())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (email, password) => {
    // ✅ UPDATED API URL
    const r = await axios.post(`${API_URL}/api/auth/login`, { email, password });

    const { token: t, user: u } = r.data;
    localStorage.setItem('mc_token', t);
    axios.defaults.headers.common['Authorization'] = `Bearer ${t}`;
    setToken(t); 
    setUser(u);
    return u;
  };

  const register = async (name, email, password) => {
    // ✅ UPDATED API URL
    const r = await axios.post(`${API_URL}/api/auth/register`, { name, email, password });

    const { token: t, user: u } = r.data;
    localStorage.setItem('mc_token', t);
    axios.defaults.headers.common['Authorization'] = `Bearer ${t}`;
    setToken(t); 
    setUser(u);
    return u;
  };

  const logout = () => {
    localStorage.removeItem('mc_token');
    delete axios.defaults.headers.common['Authorization'];
    setToken(null); 
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);