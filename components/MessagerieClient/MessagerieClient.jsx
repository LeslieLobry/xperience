"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
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

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const param = useMemo(() => searchParams.get("conversationId"), [searchParams]);
  useEffect(() => {
    if (param && !isNaN(param)) {
      setConversationId(parseInt(param));
    } else {
      setConversationId(null);
    }
  }, [param]);

  // --- MOBILE/RESPONSIVE LOGIC ---
  const isMobile = useIsMobile(900);

  // Navigation = met à jour l'URL et le state
  const handleSelectConversation = (id) => {
    router.replace(`/messagerie?conversationId=${id}`, { scroll: false });
    setConversationId(id);
  };

  const handleBack = () => {
    router.replace(`/messagerie`, { scroll: false });
    setConversationId(null);
  };

  const displayedUser = currentUser ?? user;

  if (loading || !displayedUser?.id) {
    return <div style={{ textAlign: "center", marginTop: 40, color: "#b89760" }}>Chargement messagerie...</div>;
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
          />
        </div>
      );
    } else {
      return (
        <div className="messagerie-mobile-chat">
          {/* Plus de bouton absolu ici ! */}
          <ChatBox
            conversationId={conversationId}
            utilisateur={displayedUser}
            onBack={handleBack} // <-- on passe onBack pour affichage dans ChatHeader
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
      />
      <div className="chat-section">
        {conversationId ? (
          <ChatBox conversationId={conversationId} utilisateur={displayedUser} />
        ) : (
          <div className="no-conversation">
            <p>Sélectionne une conversation</p>
          </div>
        )}
      </div>
    </div>
  );
}
