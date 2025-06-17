"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ListeConversations from "../ListeConversations/ListeConversations";
import ChatBox from "../ChatBox/ChatBox";
import "../../app/messagerie/messagerie.css";

export default function MessagerieClient({ user }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [conversationId, setConversationId] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (user?.id) setReady(true);
  }, [user]);

  useEffect(() => {
    const param = searchParams.get("conversationId");
    if (param && !isNaN(param)) {
      setConversationId(parseInt(param));
    } else {
      setConversationId(null);
    }
  }, [searchParams]);

  const handleSelectConversation = (id) => {
    router.push(`/messagerie?conversationId=${id}`);
  };

  if (!ready) return null;

  return (
    <div className="messagerie-page">
      <ListeConversations
        userId={user.id}
        onSelectConversation={handleSelectConversation}
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
