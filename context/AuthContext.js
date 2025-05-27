'use client';

import { createContext, useContext, useEffect, useState } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

const fetchUser = async () => {
  try {
    const res = await fetch('/api/me', { credentials: 'include' });
    const data = await res.json();
    if (data.success) {
      setUser(data.user);
      return data.user; // ✅ retourne les données utilisateur
    } else {
      setUser(null);
      return null;
    }
  } catch (error) {
    setUser(null);
    return null;
  }
};


  const logout = async () => {
    await fetch('/api/logout', { credentials: 'include' });
    setUser(null);
  };

  useEffect(() => {
    console.log("🔐 AuthProvider monté");
    fetchUser();
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, logout, fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
