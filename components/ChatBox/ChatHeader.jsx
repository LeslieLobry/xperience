import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Phone, Video, X, Plus, ArrowLeft } from "lucide-react";
import "./ChatBox.css";

/* -------------------------------------------------------------------------- */
/* ✅ Idle helper                                                             */
/* -------------------------------------------------------------------------- */
function runIdle(fn, timeout = 900) {
  if (typeof window === "undefined") return;
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(() => fn(), { timeout });
  } else {
    setTimeout(fn, 0);
  }
}

/* -------------------------------------------------------------------------- */
/* ✅ Presign cache global + inflight                                         */
/* -------------------------------------------------------------------------- */
const PRESIGN_TTL_MS = 50 * 60 * 1000;
const presignCache = new Map(); // key -> { url, exp }
const presignInflight = new Map(); // key -> Promise

async function getPresignedUrl(key) {
  if (!key) return "/default.jpg";
  if (typeof key === "string" && key.startsWith("http")) return key;

  const now = Date.now();
  const cached = presignCache.get(key);
  if (cached && cached.exp > now) return cached.url;

  if (presignInflight.has(key)) return presignInflight.get(key);

  const p = fetch("/api/photos/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key }),
    credentials: "include",
    keepalive: true,
  })
    .then((r) => r.json())
    .then((data) => {
      const url = data?.url || `/uploads/${key}`;
      presignCache.set(key, { url, exp: now + PRESIGN_TTL_MS });
      return url;
    })
    .catch(() => `/uploads/${key}`)
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
/* --- Hook pour les photos présignées ---                                    */
/* -------------------------------------------------------------------------- */
function usePresignedPhotos(participants) {
  const [photoUrls, setPhotoUrls] = useState({});

  // ✅ dépendance stable (évite relance de l'effet si le parent recrée le tableau)
  const participantsKey = useMemo(() => {
    return (participants || [])
      .map((p) => `${p?.id || "x"}:${p?.photoUrl || ""}`)
      .join("|");
  }, [participants]);

  useEffect(() => {
    let canceled = false;

    async function fetchGroup(list) {
      if (!list || list.length === 0) return;

      // 1) hydrate direct depuis cache pour affichage immédiat
      const now = Date.now();
      const partial = {};
      for (const p of list) {
        if (!p?.id) continue;
        const key = p.photoUrl;

        if (!key) {
          partial[p.id] = "/default.jpg";
          continue;
        }
        if (typeof key === "string" && key.startsWith("http")) {
          partial[p.id] = key;
          continue;
        }
        const cached = presignCache.get(key);
        if (cached && cached.exp > now) {
          partial[p.id] = cached.url;
        }
      }
      if (!canceled && Object.keys(partial).length) {
        setPhotoUrls((prev) => ({ ...prev, ...partial }));
      }

      // 2) fetch uniquement ce qui manque
      const toFetch = list.filter((p) => {
        if (!p?.id) return false;
        const key = p.photoUrl;
        if (!key) return false;
        if (typeof key === "string" && key.startsWith("http")) return false;

        const cached = presignCache.get(key);
        if (cached && cached.exp > Date.now()) return false;

        return true;
      });

      if (!toFetch.length) return;

      const results = await mapWithConcurrency(toFetch, 6, async (p) => {
        const url = await getPresignedUrl(p.photoUrl);
        return { id: p.id, url };
      });

      if (canceled) return;
      const next = {};
      for (const r of results) next[r.id] = r.url || "/default.jpg";
      setPhotoUrls((prev) => ({ ...prev, ...next }));
    }

    if (participants && participants.length > 0) {
      // ✅ priorité : d’abord ceux affichés tout de suite
      const uniq = [];
      const seen = new Set();
      for (const p of participants) {
        if (!p?.id) continue;
        if (seen.has(p.id)) continue;
        seen.add(p.id);
        uniq.push(p);
      }

      const priority = uniq.slice(0, 2);
      const rest = uniq.slice(2);

      runIdle(() => fetchGroup(priority).catch(() => {}), 500);
      runIdle(() => fetchGroup(rest).catch(() => {}), 1200);
    } else {
      setPhotoUrls({});
    }

    return () => {
      canceled = true;
    };
  }, [participantsKey]);

  return photoUrls;
}

export default function ChatHeader({
  participants = [],
  onCallAudio,
  onCallVideo,
  onClose,
  inCall,
  onAddParticipant,
  onBack,
}) {
  const photoUrls = usePresignedPhotos(participants);

  const isMobile =
    typeof window !== "undefined" && window.innerWidth <= 768;

  const handleAddClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // 🔹 On envoie TOUTE la liste des participants au parent
    onAddParticipant?.(participants);
  };

  return (
    <div className={`chat-header ${isMobile ? "chat-header-mobile" : ""}`}>
      <div className="chat-participants">
        {onBack && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onBack?.();
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            className="chat-back-btn"
            aria-label="Retour"
          >
            <ArrowLeft />
          </button>
        )}

        {participants.length === 0 ? (
          <p className="aucun-participant">Aucun participant trouvé</p>
        ) : (
          participants.map((p) => {
            const url =
              photoUrls[p.id] ||
              (p.photoUrl?.startsWith("http")
                ? p.photoUrl
                : p.photoUrl
                ? `/uploads/${p.photoUrl}`
                : "/default.jpg");

            return (
              <Link
                key={p.id}
                href={`/profil/${p.id}`}
                className="participant-info"
                passHref
              >
                <img
                  src={url}
                  alt={p.pseudo}
                  className="participant-avatar"
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = "/default.jpg";
                  }}
                />
                <span className="participant-name">{p.pseudo}</span>
              </Link>
            );
          })
        )}
      </div>

      <div className="chat-actions">
        {!inCall && onAddParticipant && (
          <button
            type="button"
            onClick={handleAddClick}
            title="Ajouter un membre"
            aria-label="Ajouter un membre"
            className="chat-add-btn"
          >
            <Plus />
          </button>
        )}

        {!inCall && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onCallAudio?.();
              }}
              title="Appel audio"
              aria-label="Appel audio"
            >
              <Phone />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onCallVideo?.();
              }}
              title="Appel vidéo"
              aria-label="Appel vidéo"
            >
              <Video />
            </button>
          </>
        )}

        {inCall && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose?.();
            }}
            title="Raccrocher"
            aria-label="Raccrocher"
          >
            <X />
          </button>
        )}
      </div>
    </div>
  );
}
