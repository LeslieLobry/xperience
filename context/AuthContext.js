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
      if (data.success) {
        setUser(data.user);
        return data.user;
      } else {
        setUser(null);
        return null;
      }
    } catch (error) {
      setUser(null);
      return null;
    }
  }, []); // stable tant que rien ne change (ce qui est votre cas ici)

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
