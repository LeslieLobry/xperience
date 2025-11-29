"use client";

import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import dynamic from "next/dynamic";

import "../../app/messagerie/messagerie.css";
import "./MessagerieClient.css";

/* ---------------------------------------------------------------------------
   🔹 Dynamic imports pour charger les gros blocs en différé
   --------------------------------------------------------------------------- */
const ChatBox = dynamic(() => import("../ChatBox/ChatBox"), {
  ssr: false,
  loading: () => <p>Chargement du chat...</p>,
});

const ListeConversations = dynamic(
  () => import("../ListeConversations/ListeConversations"),
  {
    ssr: false,
    loading: () => (
      <div className="messagerie-loading">
        Chargement des conversations...
      </div>
    ),
  }
);

/* ---------------------------------------------------------------------------
   🔹 Hook pour savoir si on est sur mobile
   --------------------------------------------------------------------------- */
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

/* ---------------------------------------------------------------------------
   🔹 Composant principal
   --------------------------------------------------------------------------- */
export default function MessagerieClient({ user }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const { user: currentUser, refreshUser, loading } = useAuth();

  // ⚡ On ne rafraîchit l'utilisateur QUE si on n'a rien du tout
  useEffect(() => {
    if (!currentUser && !user && !loading) {
      refreshUser();
    }
  }, [currentUser, user, loading, refreshUser]);

  const displayedUser = currentUser ?? user;

  const isMobile = useIsMobile(900);

  // ✅ Source de vérité unique : l'URL
  const conversationId = useMemo(() => {
    if (pathname === "/messagerie") return null;
    const id = searchParams.get("conversationId");
    if (!id || isNaN(Number(id))) return null;
    return Number(id);
  }, [searchParams, pathname]);

  // Navigation = met à jour l'URL (et donc conversationId automatiquement)
  const handleSelectConversation = (id) => {
    router.push(`/messagerie?conversationId=${id}`, { scroll: false });
  };

  const handleBack = () => {
    router.push(`/messagerie`, { scroll: false });
  };

  if (loading && !displayedUser?.id) {
    return (
      <div className="messagerie-loading">
        Chargement de la messagerie...
      </div>
    );
  }

  if (!displayedUser?.id) {
    return (
      <div className="messagerie-loading">
        Impossible de charger la messagerie.
      </div>
    );
  }

  /* ------------------------ VUE MOBILE ------------------------ */
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
    }

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

  /* ------------------------ VUE DESKTOP ------------------------ */
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
