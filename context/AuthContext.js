'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  // ✅ Memoïser fetchUser avec useCallback pour stabilité
const fetchUser = useCallback(async () => {
  try {
    const res = await fetch('/api/me', { credentials: 'include' });
    const data = await res.json();
    console.log("🔁 fetchUser() - data:", data);
    if (data.success && data.user) {
      setUser(data.user);
      return data.user;
    } else {
      setUser(null);
      return null;
    }
  } catch (err) {
    console.error("❌ fetchUser() error :", err);
    setUser(null);
    return null;
  }
}, []);

  const logout = async () => {
    await fetch('/api/logout', { credentials: 'include' });
    setUser(null);
  };

  const updateUser = (updatedFields) => {
    setUser((prevUser) => ({ ...prevUser, ...updatedFields }));
  };

  useEffect(() => {
    fetchUser();
  }, [fetchUser]); 

  return (
    <AuthContext.Provider value={{ user, setUser, logout, fetchUser, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
