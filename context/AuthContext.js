"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  // ✅ undefined = "pas encore vérifié" (évite redirect au refresh)
  const [user, setUser] = useState(undefined);

  const [conversations, setConversations] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [articles, setArticles] = useState([]);
  const [evenements, setEvenements] = useState([]);

  const [loading, setLoading] = useState(true);
  // ✅ devient true après le 1er check auth, et ne repasse jamais à false
  const [authReady, setAuthReady] = useState(false);

  // helper safe json (évite crash si API renvoie HTML/erreur)
  const safeJson = async (res) => {
    const text = await res.text();
    try {
      return text ? JSON.parse(text) : null;
    } catch {
      return null;
    }
  };

  // Memoïser fetchUser (pas fetchInit)
  const fetchUser = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/init", { credentials: "include" });
      const data = await safeJson(res);

      // si non-OK → on considère non connecté (et on clean)
      if (!res.ok || !data?.success) {
        setUser(null);
        setConversations([]);
        setNotifications([]);
        setArticles([]);
        setEvenements([]);
        return null;
      }

      setUser(data.utilisateur ?? null);
      setConversations(Array.isArray(data.conversations) ? data.conversations : []);
      setNotifications(Array.isArray(data.notifications) ? data.notifications : []);
      setArticles(Array.isArray(data.articles) ? data.articles : []);
      setEvenements(Array.isArray(data.evenements) ? data.evenements : []);

      return data.utilisateur ?? null;
    } catch (err) {
      console.error("❌ fetchUser error :", err);
      setUser(null);
      setConversations([]);
      setNotifications([]);
      setArticles([]);
      setEvenements([]);
      return null;
    } finally {
      setLoading(false);
      setAuthReady(true);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch("/api/me", { credentials: "include" });
      const data = await safeJson(res);

      if (!res.ok || !data?.success || !data?.utilisateur) {
        // optionnel : si /api/me dit non connecté, on peut nettoyer
        setUser(null);
        return;
      }
      setUser(data.utilisateur);
    } catch (err) {
      console.error("Erreur refreshUser:", err);
    }
  }, []);

  const logout = async () => {
    try {
      await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      console.error("❌ Erreur logout :", err);
    } finally {
      setUser(null);
      setConversations([]);
      setNotifications([]);
      setArticles([]);
      setEvenements([]);
    }
  };

  const updateUser = (updatedFields) => {
    setUser((prevUser) => ({
      ...(prevUser || {}),
      ...updatedFields,
    }));
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
        authReady, // ✅ NOUVEAU
        logout,
        fetchUser,
        updateUser,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
