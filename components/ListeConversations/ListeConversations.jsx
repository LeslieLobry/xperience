"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { Realtime } from "ably";
import "./ListeConversations.css";
import CreateConversationModal from "../CreateConversationModal/CreateConversationModal";

/* -------------------------------------------------------------------------- */
/* ✅ Idle helper                                                             */
/* -------------------------------------------------------------------------- */
function runIdle(fn, timeout = 1200) {
  if (typeof window === "undefined") return;
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(() => fn(), { timeout });
  } else {
    setTimeout(fn, 0);
  }
}

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
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/* -------------------------------------------------------------------------- */
/* ✅ Presign cache global                                                    */
/* -------------------------------------------------------------------------- */
const PRESIGN_TTL_MS = 50 * 60 * 1000;
const presignCache = new Map(); // key -> { url, exp }
const presignInflight = new Map(); // key -> Promise

async function getPresignedUrl(key) {
  if (!key) return "/default.jpg";
  if (key.startsWith("http")) return key;

  const now = Date.now();
  const cached = presignCache.get(key);
  if (cached && cached.exp > now) return cached.url;

  if (presignInflight.has(key)) return presignInflight.get(key);

  const p = fetch("/api/photos/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key }),
    credentials: "include",
  })
    .then((r) => r.json())
    .then((data) => {
      const url = data?.url || "/default.jpg";
      presignCache.set(key, { url, exp: now + PRESIGN_TTL_MS });
      return url;
    })
    .catch(() => "/default.jpg")
    .finally(() => presignInflight.delete(key));

  presignInflight.set(key, p);
  return p;
}

async function mapWithConcurrency(items, limit, mapper) {
  const ret = new Array(items.length);
  let i = 0;

  const workers = new Array(Math.min(limit, items.length)).fill(0).map(async () => {
    while (i < items.length) {
      const idx = i++;
      ret[idx] = await mapper(items[idx], idx);
    }
  });

  await Promise.all(workers);
  return ret;
}

/* -------------------------------------------------------------------------- */
/* ✅ HOOK: presign photos                                                    */
/* -------------------------------------------------------------------------- */
function usePresignedPhotos(users, priorityCount = 12) {
  const [photoUrls, setPhotoUrls] = useState({});

  const usersKey = useMemo(
    () => (users || []).map((u) => `${u.id}:${u.photoUrl || ""}`).join("|"),
    [users]
  );

  useEffect(() => {
    if (!users || users.length === 0) {
      setPhotoUrls({});
      return;
    }

    let canceled = false;

    const seen = new Set();
    const uniq = [];
    for (const u of users) {
      if (!u?.id) continue;
      if (seen.has(u.id)) continue;
      seen.add(u.id);
      uniq.push(u);
    }

    const priority = uniq.slice(0, priorityCount);
    const background = uniq.slice(priorityCount);

    const hydrateFromCache = () => {
      const partial = {};
      const now = Date.now();

      for (const u of uniq) {
        if (!u.photoUrl) {
          partial[u.id] = "/default.jpg";
          continue;
        }
        if (u.photoUrl.startsWith("http")) {
          partial[u.id] = u.photoUrl;
          continue;
        }
        const cached = presignCache.get(u.photoUrl);
        if (cached && cached.exp > now) {
          partial[u.id] = cached.url;
        }
      }

      if (!canceled && Object.keys(partial).length) {
        setPhotoUrls((prev) => ({ ...prev, ...partial }));
      }
    };

    const fetchGroup = async (group) => {
      hydrateFromCache();

      const now = Date.now();
      const toFetch = group.filter((u) => {
        if (!u.photoUrl) return false;
        if (u.photoUrl.startsWith("http")) return false;
        const cached = presignCache.get(u.photoUrl);
        if (cached && cached.exp > now) return false;
        return true;
      });

      if (toFetch.length === 0) return;

      const results = await mapWithConcurrency(toFetch, 6, async (u) => {
        const url = await getPresignedUrl(u.photoUrl);
        return { id: u.id, url };
      });

      if (canceled) return;
      const next = {};
      for (const r of results) next[r.id] = r.url || "/default.jpg";
      setPhotoUrls((prev) => ({ ...prev, ...next }));
    };

    runIdle(() => fetchGroup(priority).catch(() => {}), 800);
    runIdle(() => fetchGroup(background).catch(() => {}), 2000);

    return () => {
      canceled = true;
    };
  }, [usersKey, priorityCount]);

  return photoUrls;
}

/* -------------------------------------------------------------------------- */
/* ✅ Ably singleton + authUrl                                                */
/* -------------------------------------------------------------------------- */
let ablySingleton = null;
function getAbly() {
  if (ablySingleton) return ablySingleton;

  try {
    ablySingleton = new Realtime({
      authUrl: "/api/ably-token",
      authMethod: "GET",
      echoMessages: false,
      closeOnUnload: false,
    });
    return ablySingleton;
  } catch (_) {}

  const key = process.env.NEXT_PUBLIC_ABLY_API_KEY;
  if (!key) return null;
  ablySingleton = new Realtime(key);
  return ablySingleton;
}

/* -------------------------------------------------------------------------- */
/* ✅ Cache conversations (cold start)                                        */
/* -------------------------------------------------------------------------- */
const CONV_CACHE_KEY = "conv_cache_v1";
const CONV_CACHE_TTL_MS = 5 * 60 * 1000;

function readConvCache() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CONV_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.ts || !parsed?.data) return null;
    if (Date.now() - parsed.ts > CONV_CACHE_TTL_MS) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function writeConvCache(data) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CONV_CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
  } catch {}
}

/* -------------------------------------------------------------------------- */
/* ✅ Warm fetch messages (accélère l’ouverture d’une conversation)           */
/* -------------------------------------------------------------------------- */
function warmMessages(conversationId) {
  // aucune attente / aucun blocage : juste "chauffe" cache navigateur / CDN
  fetch(`/api/messages?conversationId=${conversationId}&limit=30`, {
    credentials: "include",
    cache: "no-store",
  }).catch(() => {});
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

  // ✅ on lit le cache une seule fois
  const cached = useMemo(() => readConvCache(), []);

  const { data, error, isLoading, mutate } = useSWR(
    userId ? "/api/conversations" : null,
    safeFetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 8000,

      // ✅ affichage instantané
      fallbackData: cached || undefined,

      // ✅ évite un écran vide si réseau lent
      keepPreviousData: true,
    }
  );

  // ✅ dès qu'on reçoit les vraies données, on met à jour le cache
  useEffect(() => {
    if (data?.conversations && Array.isArray(data.conversations)) {
      writeConvCache(data);
    }
  }, [data]);

  const rawConversations = data?.conversations || [];

  const conversations = useMemo(
    () =>
      rawConversations.filter(
        (c, i, arr) => arr.findIndex((cc) => cc.id === c.id) === i
      ),
    [rawConversations]
  );

  // Tous les "autres" utilisateurs pour presign
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

  const photoUrls = usePresignedPhotos(allAutresUsers, 16);

  // URL -> state sélectionné
  useEffect(() => {
    const idParam = searchParams?.get("conversationId");
    const id = idParam ? Number(idParam) : null;
    setSelectedId(id || null);
  }, [searchParams]);

  // Auto-sélection 1ère conversation
  useEffect(() => {
    const hasParam = !!searchParams?.get("conversationId");
    if (!autoSelectFirst) return;
    if (hasParam) return;
    if (conversations.length > 0) {
      const firstId = conversations[0].id;
      router.replace(`/messagerie?conversationId=${firstId}`);
    }
  }, [autoSelectFirst, conversations, router, searchParams]);

  // ✅ Ably → rafraîchir la liste (lazy + throttled)
  useEffect(() => {
    if (!userId) return;

    let channel = null;
    let timeout = null;
    let isMounted = true;

    const scheduleRefresh = () => {
      if (!isMounted) return;
      if (timeout) return;
      timeout = setTimeout(() => {
        mutate();
        timeout = null;
      }, 450);
    };

    runIdle(() => {
      const ably = getAbly();
      if (!ably || !isMounted) return;

      channel = ably.channels.get(`notification-${userId}`);
      channel.subscribe("message", scheduleRefresh);
      channel.subscribe("refresh-conversations", scheduleRefresh);
    }, 1200);

    return () => {
      isMounted = false;
      if (channel) {
        channel.unsubscribe("message", scheduleRefresh);
        channel.unsubscribe("refresh-conversations", scheduleRefresh);
      }
      if (timeout) clearTimeout(timeout);
    };
  }, [userId, mutate]);

  /* ---------------------------------------------------------------------- */
  /* 🔹 Actions                                                              */
  /* ---------------------------------------------------------------------- */

  const handleDelete = useCallback(
    async (id) => {
      if (!confirm("Supprimer cette conversation ?")) return;

      mutate(
        (current) => {
          if (!current) return current;
          return {
            ...current,
            conversations: (current.conversations || []).filter((c) => c.id !== id),
          };
        },
        false
      );

      try {
        await fetch(`/api/conversations/${id}`, {
          method: "DELETE",
          credentials: "include",
        });
      } catch (_) {}

      const current = Number(searchParams?.get("conversationId") || 0);
      if (current === Number(id)) {
        router.replace("/messagerie");
      }
    },
    [mutate, router, searchParams]
  );

  const handleRename = useCallback(
    async (id) => {
      const res = await fetch(`/api/conversations/${id}/rename`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom: newName }),
      });

      if (res.ok) {
        const nameToApply = newName;
        setRenamingId(null);
        setNewName("");

        mutate(
          (current) => {
            if (!current) return current;
            return {
              ...current,
              conversations: (current.conversations || []).map((c) =>
                c.id === id ? { ...c, nom: nameToApply } : c
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
    },
    [mutate, newName]
  );

 const handleSelect = useCallback(
  async (id) => {
    const conv = conversations.find((c) => Number(c.id) === Number(id));

    const initialParticipants =
      (conv?.participants || [])
        .filter((p) => Number(p.utilisateurId) !== Number(userId))
        .map((p) => p.utilisateur)
        .filter(Boolean);

    if (onSelectConversation) {
      onSelectConversation({
        id: Number(id),
        initialParticipants,
      });
    } else {
      router.replace(`/messagerie?conversationId=${id}`);
    }

    // optimistic unread badge
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

    fetch(`/api/conversations/${id}/mark-as-read`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
      keepalive: true,
    }).catch(() => {});
  },
  [conversations, mutate, onSelectConversation, router, userId]
);


  const handleClickItem = useCallback(
    (e) => {
      const id = e.currentTarget?.dataset?.id;
      if (!id) return;
      handleSelect(Number(id));
    },
    [handleSelect]
  );

  /* ---------------------------------------------------------------------- */
  /* ✅ ViewModels memo                                                      */
  /* ---------------------------------------------------------------------- */
  const viewModels = useMemo(() => {
    return conversations.map((conv) => {
      const autres = (conv.participants || [])
        .filter((p) => Number(p.utilisateurId) !== Number(userId))
        .map((p) => p.utilisateur)
        .filter(Boolean);

      const pseudo =
        autres.length === 1
          ? autres[0].pseudo
          : autres.map((u) => u.pseudo).join(", ");

      const avatarUsers = autres.slice(0, 4);
      const extraCount = Math.max(0, autres.length - avatarUsers.length);

      return {
        conv,
        pseudo,
        unreadCount: conv.unreadCount || 0,
        avatarUsers,
        extraCount,
        isActive: Number(selectedId) === Number(conv.id),
      };
    });
  }, [conversations, userId, selectedId]);

  if (error) {
    return (
      <aside className={className || "liste-conversations"}>
        Erreur de chargement des conversations.
      </aside>
    );
  }

  return (
    <aside className={className || "liste-conversations"}>
      {showModal && (
        <CreateConversationModal
          currentUserId={userId}
          onClose={() => setShowModal(false)}
          onCreated={async (newConvId) => {
            await mutate();
            if (newConvId) {
              router.replace(`/messagerie?conversationId=${newConvId}`);
            }
            setShowModal(false);
          }}
        />
      )}

      <div className="conversation-header">
        <h3>Conversations</h3>
        <button onClick={() => setShowModal(true)} className="new-conv-button">
          ➕ Nouvelle
        </button>
      </div>

      {isLoading && viewModels.length === 0 && (
        <div className="conv-skeleton-list">
          <div className="conv-skeleton-item" />
          <div className="conv-skeleton-item" />
          <div className="conv-skeleton-item" />
        </div>
      )}

      {!isLoading && viewModels.length === 0 && (
        <div className="no-conversation-message">
          <p>Aucune conversation pour l’instant.</p>
          <a href="/recherche" className="start-search-link">
            Trouver des profils à contacter
          </a>
        </div>
      )}

      {viewModels.map(({ conv, pseudo, unreadCount, avatarUsers, extraCount, isActive }) => {
        return (
          <div key={conv.id} className={`conversation-item ${isActive ? "active" : ""}`}>
            <div
              className="conversation-clickable"
              data-id={conv.id}
              onClick={handleClickItem}
              // ✅ NEW: précharge la route dès qu’on survole (desktop)
              onMouseEnter={() => {
                router.prefetch(`/messagerie?conversationId=${conv.id}`);
              }}
              // ✅ NEW: pareil au focus clavier
              onFocus={() => {
                router.prefetch(`/messagerie?conversationId=${conv.id}`);
              }}
              // ✅ NEW: warm fetch des messages AVANT le click (mobile/desktop)
              onPointerDown={() => {
                warmMessages(conv.id);
              }}
            >
              <div className="conv-main">
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
                          loading="lazy"
                          decoding="async"
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
                            loading="lazy"
                            decoding="async"
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

                      {extraCount > 0 && (
                        <div className="conv-avatar-extra">+{extraCount}</div>
                      )}
                    </div>
                  )}
                </div>

                <div className="conv-info">
                  <div className="conv-pseudo">
                    {renamingId === conv.id ? (
                      <div className="rename-inline" onClick={(e) => e.stopPropagation()}>
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

                  {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
                </div>
              </div>
            </div>

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
    </aside>
  );
}
