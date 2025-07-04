"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import ListeConversations from "../ListeConversations/ListeConversations";
import dynamic from "next/dynamic";
import "../../app/messagerie/messagerie.css";
import "./MessagerieClient.css";

// Chargement dynamique du composant ChatBox
const ChatBox = dynamic(() => import("../ChatBox/ChatBox"), {
  ssr: false,
  loading: () => <p>Chargement du chat...</p>,
});

export default function MessagerieClient({ user }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [conversationId, setConversationId] = useState(null);

  // Utilisation du user du context
  const { user: currentUser, refreshUser, loading } = useAuth();

  // Met à jour le user context au chargement de la page
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Récupère l'id de la conversation dans l'URL
  const param = useMemo(() => searchParams.get("conversationId"), [searchParams]);
  useEffect(() => {
    if (param && !isNaN(param)) {
      setConversationId(parseInt(param));
    } else {
      setConversationId(null);
    }
  }, [param]);

  const handleSelectConversation = (id) => {
    router.replace(`/messagerie?conversationId=${id}`, { scroll: false });
  };

  // Utilise currentUser du context (prioritaire), sinon le user passé en props (au tout premier chargement)
  const displayedUser = currentUser ?? user;

  if (loading || !displayedUser?.id) {
    return <div style={{ textAlign: "center", marginTop: 40, color: "#b89760" }}>Chargement messagerie...</div>;
  }

  return (
    <div className="messagerie-page">
      <ListeConversations
        userId={displayedUser.id}
        onSelectConversation={handleSelectConversation}
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
