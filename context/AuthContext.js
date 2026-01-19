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
  // ✅ undefined = "pas encore vérifié"
  const [user, setUser] = useState(undefined);

  const [conversations, setConversations] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [articles, setArticles] = useState([]);
  const [evenements, setEvenements] = useState([]);

  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);

  const safeJson = async (res) => {
    const text = await res.text();
    try {
      return text ? JSON.parse(text) : null;
    } catch {
      return null;
    }
  };

  // ✅ /api/me = vérité pour l'identité
  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch("/api/me", {
        credentials: "include",
        cache: "no-store",
      });
      const data = await safeJson(res);

      if (!res.ok || !data?.success || !data?.utilisateur?.id) {
        setUser(null);
        return null;
      }

      setUser(data.utilisateur);
      return data.utilisateur;
    } catch (err) {
      console.error("Erreur refreshUser:", err);
      setUser(null);
      return null;
    }
  }, []);

  // ✅ init = récupère les données, mais ne doit pas décider l'identité
  const fetchUser = useCallback(async () => {
    setLoading(true);
    try {
      // 1) Identité fiable
      const me = await refreshUser();
      if (!me?.id) {
        setConversations([]);
        setNotifications([]);
        setArticles([]);
        setEvenements([]);
        return null;
      }

      // 2) Données d'init
      const res = await fetch("/api/init", {
        credentials: "include",
        cache: "no-store",
      });
      const data = await safeJson(res);

      if (!res.ok || !data?.success) {
        // on garde l'identité (me) mais on vide les datas si init échoue
        setConversations([]);
        setNotifications([]);
        setArticles([]);
        setEvenements([]);
        return me;
      }

      // ⚠️ IMPORTANT : on ne prend pas data.utilisateur ici
      setConversations(Array.isArray(data.conversations) ? data.conversations : []);
      setNotifications(Array.isArray(data.notifications) ? data.notifications : []);
      setArticles(Array.isArray(data.articles) ? data.articles : []);
      setEvenements(Array.isArray(data.evenements) ? data.evenements : []);

      return me;
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
  }, [refreshUser]);

  const logout = async () => {
    try {
      await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
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
        authReady,
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
