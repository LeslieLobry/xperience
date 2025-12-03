"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { Realtime } from "ably";
import "./ListeConversations.css";
import CreateConversationModal from "../CreateConversationModal/CreateConversationModal";

const ably = new Realtime(process.env.NEXT_PUBLIC_ABLY_API_KEY);

/* -------------------------------------------------------------------------- */
/* 🔹 Fetcher allégé                                                          */
/* -------------------------------------------------------------------------- */
const safeFetcher = async (url) => {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      msg = data?.error || data?.message || msg;
    } catch (_) {}
    throw new Error(msg);
  }
  return res.json();
};

/* -------------------------------------------------------------------------- */
/* 🔹 Initiales                                                               */
/* -------------------------------------------------------------------------- */
function getInitials(name) {
  if (!name) return "?";
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/* -------------------------------------------------------------------------- */
/* 🔹 HOOK: presign photos des utilisateurs (clé S3 -> URL)                   */
/*      - déduplication                                                       */
/*      - dépendance légère (id:photoUrl)                                     */
/* -------------------------------------------------------------------------- */
function usePresignedPhotos(users) {
  const [photoUrls, setPhotoUrls] = useState({});

  // Clé compacte pour détecter un vrai changement utile
  const usersKey = useMemo(
    () =>
      (users || [])
        .map((u) => `${u.id}:${u.photoUrl || ""}`)
        .join("|"),
    [users]
  );

  useEffect(() => {
    if (!users || users.length === 0) {
      setPhotoUrls({});
      return;
    }

    let canceled = false;

    async function fetchAll() {
      const result = {};
      const seen = new Set();

      const uniqUsers = [];
      for (const u of users) {
        if (!u?.id) continue;
        if (seen.has(u.id)) continue;
        seen.add(u.id);
        uniqUsers.push(u);
      }

      await Promise.all(
        uniqUsers.map(async (u) => {
          // Pas de photo → placeholder
          if (!u.photoUrl) {
            result[u.id] = "/default.jpg";
            return;
          }

          // URL déjà complète
          if (u.photoUrl.startsWith("http")) {
            result[u.id] = u.photoUrl;
            return;
          }

          try {
            const res = await fetch("/api/photos/presign", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ key: u.photoUrl }),
            });
            const data = await res.json();
            result[u.id] = data.url || "/default.jpg";
          } catch (e) {
            console.error("Erreur presign photo pour user", u.id, e);
            result[u.id] = "/default.jpg";
          }
        })
      );

      if (!canceled) {
        setPhotoUrls(result);
      }
    }

    fetchAll();

    return () => {
      canceled = true;
    };
  }, [usersKey]);

  return photoUrls;
}

/* -------------------------------------------------------------------------- */
/* 🔹 Composant principal                                                     */
/* -------------------------------------------------------------------------- */
export default function ListeConversations({
  userId,
  onSelectConversation,
  autoSelectFirst = true,
  className,
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [selectedId, setSelectedId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [renamingId, setRenamingId] = useState(null);
  const [newName, setNewName] = useState("");

  const {
    data,
    error,
    isLoading,
    mutate,
  } = useSWR(userId ? "/api/conversations" : null, safeFetcher, {
    revalidateOnFocus: false,      // 🔥 évite les refetch automatiques en plus
    dedupingInterval: 5000,       // évite les doublons rapprochés
  });

  const rawConversations = data?.conversations || [];

  const conversations = useMemo(
    () =>
      rawConversations.filter(
        (c, i, arr) => arr.findIndex((cc) => cc.id === c.id) === i
      ),
    [rawConversations]
  );

  // Tous les "autres" utilisateurs pour précharger leurs photos
  const allAutresUsers = useMemo(() => {
    const map = {};
    conversations.forEach((conv) => {
      (conv.participants || []).forEach((p) => {
        if (Number(p.utilisateurId) === Number(userId)) return;
        const u = p.utilisateur;
        if (!u) return;
        map[u.id] = u;
      });
    });
    return Object.values(map);
  }, [conversations, userId]);

  const photoUrls = usePresignedPhotos(allAutresUsers);

  // URL -> state sélectionné
  useEffect(() => {
    const idParam = searchParams?.get("conversationId");
    const id = idParam ? Number(idParam) : null;
    setSelectedId(id || null);
  }, [searchParams]);

  // Auto-sélection 1ère conversation (optionnel)
  useEffect(() => {
    const hasParam = !!searchParams?.get("conversationId");
    if (!autoSelectFirst) return;
    if (hasParam) return;
    if (conversations.length > 0) {
      const firstId = conversations[0].id;
      router.replace(`/messagerie?conversationId=${firstId}`);
    }
  }, [autoSelectFirst, conversations, router, searchParams]);

  // Ably → rafraîchir la liste de manière THROTTLÉE
  useEffect(() => {
    if (!userId) return;
    const channel = ably.channels.get(`notification-${userId}`);

    let timeout = null;
    const scheduleRefresh = () => {
      if (timeout) return; // on regroupe plusieurs events
      timeout = setTimeout(() => {
        mutate();
        timeout = null;
      }, 400); // 0,4s → fluide sans spammer le backend
    };

    channel.subscribe("message", scheduleRefresh);
    channel.subscribe("refresh-conversations", scheduleRefresh);

    return () => {
      channel.unsubscribe("message", scheduleRefresh);
      channel.unsubscribe("refresh-conversations", scheduleRefresh);
      if (timeout) clearTimeout(timeout);
    };
  }, [userId, mutate]);

  /* ---------------------------------------------------------------------- */
  /* 🔹 Actions : delete / rename / select                                  */
  /* ---------------------------------------------------------------------- */

  const handleDelete = async (id) => {
    if (!confirm("Supprimer cette conversation ?")) return;

    // 🔥 Optimistic : on enlève directement la conv de la liste
    mutate(
      (current) => {
        if (!current) return current;
        return {
          ...current,
          conversations: (current.conversations || []).filter(
            (c) => c.id !== id
          ),
        };
      },
      false // pas de refetch immédiat
    );

    try {
      await fetch(`/api/conversations/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
    } catch (_) {
      // En cas d'erreur, Ably ou un refresh manuel remettra d'équerre
    }

    const current = Number(searchParams?.get("conversationId") || 0);
    if (current === Number(id)) {
      router.replace("/messagerie");
    }
  };

  const handleRename = async (id) => {
    const res = await fetch(`/api/conversations/${id}/rename`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nom: newName }),
    });
    if (res.ok) {
      setRenamingId(null);
      setNewName("");

      // 🔥 Optimistic : met à jour localement sans attendre le refetch
      mutate(
        (current) => {
          if (!current) return current;
          return {
            ...current,
            conversations: (current.conversations || []).map((c) =>
              c.id === id ? { ...c, nom: newName } : c
            ),
          };
        },
        false
      );
    } else {
      let msg = "Erreur lors du renommage";
      try {
        const j = await res.json();
        msg = j?.error || j?.message || msg;
      } catch (_) {}
      alert(msg);
    }
  };

  const handleSelect = async (id) => {
    router.replace(`/messagerie?conversationId=${id}`);
    onSelectConversation?.(id);

    // 🔥 Optimistic : passe le compteur non lus à 0 localement
    mutate(
      (current) => {
        if (!current) return current;
        return {
          ...current,
          conversations: (current.conversations || []).map((c) =>
            c.id === id ? { ...c, unreadCount: 0 } : c
          ),
        };
      },
      false
    );

    // On prévient le backend, mais on n'attend pas la réponse pour l'UI
    fetch(`/api/conversations/${id}/mark-as-read`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    }).catch(() => {});
  };

  /* ---------------------------------------------------------------------- */
  /* 🔹 UI                                                                  */
  /* ---------------------------------------------------------------------- */

  if (error) {
    return (
      <aside className={className || "liste-conversations"}>
        Erreur de chargement des conversations.
      </aside>
    );
  }

  return (
    <aside className={className || "liste-conversations"}>
      <div className="conversation-header">
        <h3>Conversations</h3>
        <button onClick={() => setShowModal(true)} className="new-conv-button">
          ➕ Nouvelle
        </button>
      </div>

      {/* Petit état de chargement "rapide" pour le ressenti */}
      {isLoading && conversations.length === 0 && (
        <div className="conv-skeleton-list">
          <div className="conv-skeleton-item" />
          <div className="conv-skeleton-item" />
          <div className="conv-skeleton-item" />
        </div>
      )}

      {!isLoading && conversations.length === 0 && (
        <div className="no-conversation-message">
          <p>Aucune conversation pour l’instant.</p>
          <a href="/recherche" className="start-search-link">
            Trouver des profils à contacter
          </a>
        </div>
      )}

      {conversations.map((conv) => {
        const autres = (conv.participants || [])
          .filter((p) => Number(p.utilisateurId) !== Number(userId))
          .map((p) => p.utilisateur)
          .filter(Boolean);

        const pseudo =
          autres.length === 1 ? autres[0].pseudo : autres.map((u) => u.pseudo).join(", ");

        const unreadCount = conv.unreadCount || 0;
        const avatarUsers = autres.slice(0, 2);

        return (
          <div
            key={conv.id}
            className={`conversation-item ${
              Number(selectedId) === Number(conv.id) ? "active" : ""
            }`}
          >
            {/* Zone cliquable = ouvre la conversation */}
            <div className="conversation-clickable" onClick={() => handleSelect(conv.id)}>
              <div className="conv-main">
                {/* === Avatars === */}
                <div className="conv-avatar">
                  {avatarUsers.length === 0 && (
                    <div className="conv-avatar-placeholder">
                      {getInitials(conv.nom || pseudo || "")}
                    </div>
                  )}

                  {avatarUsers.length === 1 &&
                    (() => {
                      const u = avatarUsers[0];
                      const url = photoUrls[u.id];

                      return url && url !== "/default.jpg" ? (
                        <img
                          src={url}
                          alt={u.pseudo || "Photo de profil"}
                          className="conv-avatar-img"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = "/default.jpg";
                          }}
                        />
                      ) : (
                        <div className="conv-avatar-placeholder">
                          {getInitials(u.pseudo)}
                        </div>
                      );
                    })()}

                  {avatarUsers.length > 1 && (
                    <div className="conv-avatar-stack">
                      {avatarUsers.map((u, index) => {
                        const url = photoUrls[u.id];
                        return url && url !== "/default.jpg" ? (
                          <img
                            key={u.id || index}
                            src={url}
                            alt={u.pseudo || "Photo de profil"}
                            className={`conv-avatar-img stacked stacked-${index}`}
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = "/default.jpg";
                            }}
                          />
                        ) : (
                          <div
                            key={u.id || index}
                            className={`conv-avatar-placeholder stacked stacked-${index}`}
                          >
                            {getInitials(u.pseudo)}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* === Infos conv === */}
                <div className="conv-info">
                  <div className="conv-pseudo">
                    {renamingId === conv.id ? (
                      <div
                        className="rename-inline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleRename(conv.id);
                          }}
                          autoFocus
                          style={{ width: 120, marginRight: 6 }}
                          maxLength={40}
                        />
                        <button onClick={() => handleRename(conv.id)}>OK</button>
                        <button
                          onClick={() => {
                            setRenamingId(null);
                            setNewName("");
                          }}
                        >
                          Annuler
                        </button>
                      </div>
                    ) : (
                      <>{conv.nom || pseudo}</>
                    )}
                  </div>

                  {unreadCount > 0 && (
                    <span className="notif-badge">{unreadCount}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Actions à droite */}
            <div className="conv-actions">
              {renamingId !== conv.id && (
                <button
                  className="rename-conv-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setRenamingId(conv.id);
                    setNewName(conv.nom || "");
                  }}
                  title="Renommer cette conversation"
                >
                  ✏️
                </button>
              )}
              <button
                className="delete-conv-button"
                onClick={() => handleDelete(conv.id)}
                title="Supprimer cette conversation"
              >
                🗑️
              </button>
            </div>
          </div>
        );
      })}

      {showModal && (
        <CreateConversationModal
          currentUserId={userId}
          onClose={() => setShowModal(false)}
          onCreated={async (newConvId) => {
            // ici, un vrai refetch ponctuel est OK
            await mutate();
            if (newConvId) {
              router.replace(`/messagerie?conversationId=${newConvId}`);
            }
            setShowModal(false);
          }}
        />
      )}
    </aside>
  );
}
