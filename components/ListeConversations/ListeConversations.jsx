"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { Realtime } from "ably";
import { FixedSizeList as List } from "react-window";
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
/* ✅ Presign cache global (évite 50 requêtes)                                */
/* -------------------------------------------------------------------------- */
const PRESIGN_TTL_MS = 50 * 60 * 1000; // 50 min (si tes URLs durent 1h)
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

/* Limiteur de concurrence (évite de spammer le navigateur) */
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
/* ✅ HOOK: presign photos (priorité aux visibles + background)               */
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

    // uniq users
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

    runIdle(() => {
      fetchGroup(priority).catch(() => {});
    }, 600);

    runIdle(() => {
      fetchGroup(background).catch(() => {});
    }, 2000);

    return () => {
      canceled = true;
    };
  }, [usersKey, priorityCount]);

  return photoUrls;
}

/* -------------------------------------------------------------------------- */
/* ✅ Ably: lazy singleton                                                     */
/* -------------------------------------------------------------------------- */
let ablySingleton = null;
function getAbly() {
  if (ablySingleton) return ablySingleton;
  const key = process.env.NEXT_PUBLIC_ABLY_API_KEY;
  if (!key) return null;
  ablySingleton = new Realtime(key);
  return ablySingleton;
}

/* -------------------------------------------------------------------------- */
/* ✅ Détection “device lent” (réduit le coût des avatars)                     */
/* -------------------------------------------------------------------------- */
function useLowEndDevice() {
  const [lowEnd, setLowEnd] = useState(false);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const cores = Number(navigator.hardwareConcurrency || 8);
    const mem = Number(navigator.deviceMemory || 8);
    const net = navigator.connection?.effectiveType || "";
    const saveData = !!navigator.connection?.saveData;

    // règles simples et agressives (tu veux le max perf)
    const isLow =
      cores <= 4 ||
      mem <= 4 ||
      saveData ||
      net.includes("2g") ||
      net.includes("slow-2g");

    setLowEnd(isLow);
  }, []);

  return lowEnd;
}

/* -------------------------------------------------------------------------- */
/* ✅ Row memo (clé perf)                                                      */
/* -------------------------------------------------------------------------- */
const ConversationRow = React.memo(function ConversationRow({
  conv,
  userId,
  selectedId,
  photoUrls,
  lowEnd,
  onSelect,
  onDelete,
  onStartRename,
  renamingId,
  newName,
  setNewName,
  onConfirmRename,
  onCancelRename,
  style,
}) {
  const autres = (conv.participants || [])
    .filter((p) => Number(p.utilisateurId) !== Number(userId))
    .map((p) => p.utilisateur)
    .filter(Boolean);

  const pseudo =
    autres.length === 1
      ? autres[0].pseudo
      : autres.map((u) => u.pseudo).join(", ");

  const unreadCount = conv.unreadCount || 0;

  // ✅ Sur device lent: 1 avatar max (gros gain)
  const avatarUsers = lowEnd ? autres.slice(0, 1) : autres.slice(0, 4);
  const extraCount = Math.max(0, autres.length - avatarUsers.length);

  return (
    <div style={style}>
      <div
        className={`conversation-item ${
          Number(selectedId) === Number(conv.id) ? "active" : ""
        }`}
      >
        <div className="conversation-clickable" onClick={() => onSelect(conv.id)}>
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
                  const url = photoUrls?.[u.id];

                  return url && url !== "/default.jpg" ? (
                    <img
                      src={url}
                      alt={u.pseudo || "Photo de profil"}
                      className="conv-avatar-img"
                      loading="lazy"
                      decoding="async"
                      fetchPriority="low"
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

              {avatarUsers.length > 1 && !lowEnd && (
                <div className="conv-avatar-stack">
                  {avatarUsers.map((u, index) => {
                    const url = photoUrls?.[u.id];
                    return url && url !== "/default.jpg" ? (
                      <img
                        key={u.id || index}
                        src={url}
                        alt={u.pseudo || "Photo de profil"}
                        className={`conv-avatar-img stacked stacked-${index}`}
                        loading="lazy"
                        decoding="async"
                        fetchPriority="low"
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
                        if (e.key === "Enter") onConfirmRename(conv.id);
                        if (e.key === "Escape") onCancelRename();
                      }}
                      autoFocus
                      maxLength={40}
                      style={{ width: 120, marginRight: 6 }}
                    />
                    <button onClick={() => onConfirmRename(conv.id)}>OK</button>
                    <button onClick={onCancelRename}>Annuler</button>
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
                onStartRename(conv.id, conv.nom || "");
              }}
              title="Renommer cette conversation"
            >
              ✏️
            </button>
          )}
          <button
            className="delete-conv-button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(conv.id);
            }}
            title="Supprimer cette conversation"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  );
});

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
  const lowEnd = useLowEndDevice();

  const [selectedId, setSelectedId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [renamingId, setRenamingId] = useState(null);
  const [newName, setNewName] = useState("");

  // ✅ hauteur liste (pour virtualisation)
  const containerRef = useRef(null);
  const [listHeight, setListHeight] = useState(600);

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;

    const compute = () => {
      // hauteur dispo = container - header (approx)
      // si tu changes ton header, ajuste 64
      const h = el.getBoundingClientRect().height - 64;
      setListHeight(Math.max(240, Math.floor(h)));
    };

    compute();
    const ro = new ResizeObserver(() => compute());
    ro.observe(el);
    window.addEventListener("resize", compute);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", compute);
    };
  }, []);

  const { data, error, isLoading, mutate } = useSWR(
    userId ? "/api/conversations" : null,
    safeFetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshInterval: 0,
      dedupingInterval: 15000, // ✅ plus calme
    }
  );

  const rawConversations = data?.conversations || [];

  const conversations = useMemo(() => {
    // uniq + stable
    const seen = new Set();
    const out = [];
    for (const c of rawConversations) {
      if (!c?.id) continue;
      if (seen.has(c.id)) continue;
      seen.add(c.id);
      out.push(c);
    }
    return out;
  }, [rawConversations]);

  // ✅ presign seulement pour les gens qu’on va vraiment afficher vite
  const allAutresUsers = useMemo(() => {
    const map = {};
    // On prend une fenêtre de conversations (max) pour éviter de préparer 500 users
    const slice = conversations.slice(0, 80);
    slice.forEach((conv) => {
      (conv.participants || []).forEach((p) => {
        if (Number(p.utilisateurId) === Number(userId)) return;
        const u = p.utilisateur;
        if (!u) return;
        map[u.id] = u;
      });
    });
    return Object.values(map);
  }, [conversations, userId]);

  // ✅ Sur low-end: moins de priorité, ça respire
  const photoUrls = usePresignedPhotos(allAutresUsers, lowEnd ? 8 : 16);

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

  // ✅ Ably → rafraîchir la liste (throttle + idle)
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
      }, 650); // ✅ un peu plus “calme” pour éviter rafales
    };

    runIdle(() => {
      const ably = getAbly();
      if (!ably || !isMounted) return;

      channel = ably.channels.get(`notification-${userId}`);
      channel.subscribe("message", scheduleRefresh);
      channel.subscribe("refresh-conversations", scheduleRefresh);
    }, 900);

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

      const currentId = Number(searchParams?.get("conversationId") || 0);
      if (currentId === Number(id)) {
        router.replace("/messagerie");
      }
    },
    [mutate, router, searchParams]
  );

  const handleStartRename = useCallback((id, currentName) => {
    setRenamingId(id);
    setNewName(currentName || "");
  }, []);

  const handleCancelRename = useCallback(() => {
    setRenamingId(null);
    setNewName("");
  }, []);

  const handleConfirmRename = useCallback(
    async (id) => {
      const nameToApply = newName.trim();
      if (!nameToApply.length) return;

      const res = await fetch(`/api/conversations/${id}/rename`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom: nameToApply }),
      });

      if (res.ok) {
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
    (id) => {
      if (onSelectConversation) onSelectConversation(id);
      else router.replace(`/messagerie?conversationId=${id}`);

      // ✅ Optimistic: unread à 0 SANS rerender global violent (row memo + virtual)
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
    [mutate, onSelectConversation, router, userId]
  );

  /* ---------------------------------------------------------------------- */
  /* 🔹 UI                                                                   */
  /* ---------------------------------------------------------------------- */

  if (error) {
    return (
      <aside className={className || "liste-conversations"}>
        Erreur de chargement des conversations.
      </aside>
    );
  }

  return (
    <aside ref={containerRef} className={className || "liste-conversations"}>
      {showModal && (
        <CreateConversationModal
          currentUserId={userId}
          onClose={() => setShowModal(false)}
          onCreated={async (newConvId) => {
            await mutate();
            if (newConvId) router.replace(`/messagerie?conversationId=${newConvId}`);
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

      {/* ✅ VIRTUALISATION : la clé perf */}
      {conversations.length > 0 && (
        <List
          height={listHeight}
          itemCount={conversations.length}
          itemSize={78} // ajuste si ton row est plus grand/petit
          width="100%"
          overscanCount={6} // un peu d'avance pour scroll fluide
        >
          {({ index, style }) => {
            const conv = conversations[index];
            return (
              <ConversationRow
                key={conv.id}
                conv={conv}
                userId={userId}
                selectedId={selectedId}
                photoUrls={photoUrls}
                lowEnd={lowEnd}
                onSelect={handleSelect}
                onDelete={handleDelete}
                onStartRename={handleStartRename}
                renamingId={renamingId}
                newName={newName}
                setNewName={setNewName}
                onConfirmRename={handleConfirmRename}
                onCancelRename={handleCancelRename}
                style={style}
              />
            );
          }}
        </List>
      )}
    </aside>
  );
}
