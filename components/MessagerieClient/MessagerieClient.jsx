"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import ListeConversations from "../ListeConversations/ListeConversations";
import dynamic from "next/dynamic";
import "../../app/messagerie/messagerie.css";
import "./MessagerieClient.css";

const ChatBox = dynamic(() => import("../ChatBox/ChatBox"), {
  ssr: false,
  loading: () => <p>Chargement du chat...</p>,
});

// HOOK pour détecter le mobile
function useIsMobile(breakpoint = 900) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" && window.innerWidth < breakpoint
  );

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [breakpoint]);

  return isMobile;
}

export default function MessagerieClient({ user }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [conversationId, setConversationId] = useState(null);

  const { user: currentUser, refreshUser, loading } = useAuth();

  // 🧍 user courant : priorité au contexte, sinon user passé par la page
  const displayedUser = currentUser ?? user;

  const isMobile = useIsMobile(900);

  // ⚡ Ne rafraîchir l'user QUE si on n'en a vraiment pas encore
  useEffect(() => {
    if (!currentUser && !loading) {
      refreshUser();
    }
  }, [currentUser, loading, refreshUser]);

  // ⚡ Pré-chargement du bundle ChatBox en tâche de fond
  useEffect(() => {
    // pas de await, juste pour que le chunk soit chargé
    import("../ChatBox/ChatBox").catch(() => {});
  }, []);

  // Marquer les messages non lus comme lus (en tâche de fond)
  useEffect(() => {
    if (!displayedUser?.id) return;

    fetch("/api/messages/nonlus", {
      method: "PATCH",
    }).catch(() => {});
  }, [displayedUser?.id]);

  // ✅ Source de vérité = query `conversationId`
  useEffect(() => {
    const id = searchParams.get("conversationId");
    if (id && !isNaN(Number(id))) {
      setConversationId(Number(id));
    } else {
      setConversationId(null);
    }
  }, [searchParams]);

  const handleSelectConversation = (id) => {
    router.push(`/messagerie?conversationId=${id}`, { scroll: false });
    setConversationId(id);
  };

  const handleBack = () => {
    router.push(`/messagerie`, { scroll: false });
    setConversationId(null);
  };

  // 🟡 Cas où on n'a aucun user et que le contexte est encore en chargement
  // => on affiche juste le spinner
  if (!displayedUser?.id && loading) {
    return (
      <div style={{ textAlign: "center", marginTop: 40, color: "#b89760" }}>
        Chargement messagerie...
      </div>
    );
  }

  // 🔴 Cas où on n'a pas d'user du tout (ni prop, ni contexte)
  if (!displayedUser?.id) {
    return (
      <div style={{ textAlign: "center", marginTop: 40, color: "#b89760" }}>
        Tu dois être connecté pour accéder à la messagerie.
      </div>
    );
  }

  // --- MOBILE VIEW ---
  if (isMobile) {
    if (!conversationId) {
      return (
        <div className="messagerie-mobile-list">
          <ListeConversations
            userId={displayedUser.id}
            onSelectConversation={handleSelectConversation}
            selectedId={conversationId}
            autoSelectFirst={false}
          />
        </div>
      );
    } else {
      return (
        <div className="messagerie-mobile-chat">
          <ChatBox
            conversationId={conversationId}
            utilisateur={displayedUser}
            onBack={handleBack}
          />
        </div>
      );
    }
  }

  // --- DESKTOP VIEW ---
  return (
    <div className="messagerie-page">
      <ListeConversations
        userId={displayedUser.id}
        onSelectConversation={handleSelectConversation}
        selectedId={conversationId}
        className="liste-conversations"
        autoSelectFirst={false}
      />

      <div className="chat-section">
        {conversationId ? (
          <ChatBox
            conversationId={conversationId}
            utilisateur={displayedUser}
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
