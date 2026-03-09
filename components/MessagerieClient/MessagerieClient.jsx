"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import ListeConversations from "../ListeConversations/ListeConversations";
import dynamic from "next/dynamic";
import "../../app/messagerie/messagerie.css";
import "./MessagerieClient.css";

const ChatBox = dynamic(() => import("../ChatBox/ChatBox"), {
  ssr: false,
  loading: () => <p>Chargement du chat...</p>,
});

// ✅ Hook mobile optimisé : throttle RAF + pas de setState si inchangé
function useIsMobile(breakpoint = 900) {
  const get = () =>
    typeof window !== "undefined" ? window.innerWidth < breakpoint : false;

  const [isMobile, setIsMobile] = useState(get);

  useEffect(() => {
    let raf = 0;

    const handler = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const next = get();
        setIsMobile((prev) => (prev === next ? prev : next));
      });
    };

    window.addEventListener("resize", handler, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", handler);
    };
  }, [breakpoint]);

  return isMobile;
}

export default function MessagerieClient({ user }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const { user: currentUser, refreshUser, loading } = useAuth();

  // 🧍 user courant : priorité au contexte, sinon user passé par la page
  const displayedUser = currentUser ?? user;

  const isMobile = useIsMobile(900);

  // ✅ Source de vérité URL
  const urlConversationId = useMemo(() => {
    const id = searchParams.get("conversationId");
    const n = Number(id);
    return id && !isNaN(n) ? n : null;
  }, [searchParams]);

  const [initialParticipants, setInitialParticipants] = useState([]);

  // ✅ conversation active immédiate côté UI
  const [activeConversationId, setActiveConversationId] = useState(urlConversationId);

  // ✅ synchronise l’état local quand l’URL change réellement
  useEffect(() => {
    setActiveConversationId(urlConversationId);
  }, [urlConversationId]);

  // ⚡ Ne rafraîchir l'user QUE si on n'en a vraiment pas encore
  useEffect(() => {
    if (!currentUser && !loading) {
      refreshUser();
    }
  }, [currentUser, loading, refreshUser]);

  // ⚡ Pré-chargement ChatBox en idle
  useEffect(() => {
    const run = () => import("../ChatBox/ChatBox").catch(() => {});
    if (typeof window === "undefined") return;

    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(run, { timeout: 1200 });
      return () => window.cancelIdleCallback(id);
    } else {
      const t = setTimeout(run, 300);
      return () => clearTimeout(t);
    }
  }, []);

  // ✅ Patch non lus : une fois par user
  const patchedNonLusRef = useRef(null);
  useEffect(() => {
    if (!displayedUser?.id) return;

    if (patchedNonLusRef.current === displayedUser.id) return;
    patchedNonLusRef.current = displayedUser.id;

    fetch("/api/messages/nonlus", { method: "PATCH" }).catch(() => {});
  }, [displayedUser?.id]);

  const handleSelectConversation = useCallback(
    (payload) => {
      const id = typeof payload === "object" ? payload?.id : payload;
      const initP =
        typeof payload === "object" ? payload?.initialParticipants : null;

      if (!id) return;

      // ✅ mise à jour immédiate de l’UI
      setActiveConversationId(id);

      if (Array.isArray(initP)) setInitialParticipants(initP);
      else setInitialParticipants([]);

      router.push(`/messagerie?conversationId=${id}`, { scroll: false });
    },
    [router]
  );

  const handleBack = useCallback(() => {
    setActiveConversationId(null);
    setInitialParticipants([]);
    router.push(`/messagerie`, { scroll: false });
  }, [router]);

  // 🟡 Cas où on n'a aucun user et que le contexte est encore en chargement
  if (!displayedUser?.id && loading) {
    return (
      <div style={{ textAlign: "center", marginTop: 40, color: "#b89760" }}>
        Chargement messagerie...
      </div>
    );
  }

  // 🔴 Cas où on n'a pas d'user du tout
  if (!displayedUser?.id) {
    return (
      <div style={{ textAlign: "center", marginTop: 40, color: "#b89760" }}>
        Tu dois être connecté pour accéder à la messagerie.
      </div>
    );
  }

  // --- MOBILE VIEW ---
  if (isMobile) {
    if (!activeConversationId) {
      return (
        <div className="messagerie-mobile-list">
          <ListeConversations
            userId={displayedUser.id}
            onSelectConversation={handleSelectConversation}
            selectedId={activeConversationId}
            autoSelectFirst={false}
          />
        </div>
      );
    }

    return (
      <div className="messagerie-mobile-chat">
        <ChatBox
          key={activeConversationId}
          conversationId={activeConversationId}
          utilisateur={displayedUser}
          initialParticipants={initialParticipants}
          onBack={handleBack}
        />
      </div>
    );
  }

  // --- DESKTOP VIEW ---
  return (
    <div className="messagerie-page">
      <ListeConversations
        userId={displayedUser.id}
        onSelectConversation={handleSelectConversation}
        selectedId={activeConversationId}
        className="liste-conversations"
        autoSelectFirst={false}
      />

      <div className="chat-section">
        {activeConversationId ? (
          <ChatBox
            key={activeConversationId}
            conversationId={activeConversationId}
            utilisateur={displayedUser}
            initialParticipants={initialParticipants}
            onBack={handleBack}
          />
        ) : (
          <div className="no-conversation">
            <p>Sélectionne une conversation</p>
          </div>
        )}
      </div>
    </div>
  );
}