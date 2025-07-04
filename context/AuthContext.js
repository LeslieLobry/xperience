'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [articles, setArticles] = useState([]);
  const [evenements, setEvenements] = useState([]);
  const [loading, setLoading] = useState(true);

  // Memoïser fetchUser (pas fetchInit)
  const fetchUser = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/init', { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setUser(data.utilisateur);
        setConversations(data.conversations);
        setNotifications(data.notifications);
        setArticles(data.articles);
        setEvenements(data.evenements);
        return data.utilisateur;  // optionnel, utile pour await
      } else {
        setUser(null);
        return null;
      }
    } catch (err) {
      console.error("❌ fetchUser error :", err);
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = async () => {
    try {
      await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include',
      });
      setUser(null);
      setConversations([]);
      setNotifications([]);
      setArticles([]);
      setEvenements([]);
    } catch (err) {
      console.error("❌ Erreur logout :", err);
    }
  };

  const updateUser = (updatedFields) => {
    setUser((prevUser) => ({ ...prevUser, ...updatedFields }));
  };

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        conversations,
        notifications,
        articles,
        evenements,
        loading,
        logout,
        fetchUser,  
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
