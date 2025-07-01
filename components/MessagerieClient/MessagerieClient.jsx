"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import ListeConversations from "../ListeConversations/ListeConversations";
import dynamic from "next/dynamic";
import "../../app/messagerie/messagerie.css";
import "./MessagerieClient.css";

// Chargement dynamique de ChatBox (désactive SSR pour ce gros composant)
const ChatBox = dynamic(() => import("../ChatBox/ChatBox"), {
  ssr: false,
  loading: () => <p>Chargement du chat...</p>,
});

export default function MessagerieClient({ user }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [conversationId, setConversationId] = useState(null);

  // Mémo pour éviter recalcul inutile
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

  if (!user?.id) return null;

  return (
    <div className="messagerie-page">
      <ListeConversations
        userId={user.id}
        onSelectConversation={handleSelectConversation}
        className="liste-conversations"
      />

      <div className="chat-section">
        {conversationId ? (
          <ChatBox conversationId={conversationId} utilisateur={user} />
        ) : (
          <div className="no-conversation">
            <p>Sélectionne une conversation</p>
          </div>
        )}
      </div>
    </div>
  );
}
