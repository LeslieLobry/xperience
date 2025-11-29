"use client";

import { useSearchParams, usePathname, useRouter } from "next/navigation";
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
  const pathname = usePathname();
  const router = useRouter();

  const [conversationId, setConversationId] = useState(null);

  const { user: currentUser, refreshUser, loading } = useAuth();

  // user courant (priorité au contexte)
  const displayedUser = currentUser ?? user;

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // 🔴 ICI : quand on est dans la messagerie et qu'on connaît l'utilisateur,
  // on marque tous les messages non lus comme lus
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

  // --- MOBILE/RESPONSIVE LOGIC ---
  const isMobile = useIsMobile(900);

  // Navigation = met à jour l'URL et le state
  const handleSelectConversation = (id) => {
    router.push(`/messagerie?conversationId=${id}`, { scroll: false });
    setConversationId(id);
  };

  const handleBack = () => {
    router.push(`/messagerie`, { scroll: false });
    setConversationId(null);
  };

  if (loading || !displayedUser?.id) {
    return (
      <div style={{ textAlign: "center", marginTop: 40, color: "#b89760" }}>
        Chargement messagerie...
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
