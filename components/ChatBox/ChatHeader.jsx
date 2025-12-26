import { useEffect, useState, useMemo, useRef } from "react";
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
/* ✅ Presign cache global + inflight (batch)                                 */
/* -------------------------------------------------------------------------- */
const PRESIGN_TTL_MS = 50 * 60 * 1000;
const presignCache = new Map(); // key -> { url, exp }
const presignBatchInflight = new Map(); // batchKey -> Promise<{[key]: url}>

function isHttpUrl(v) {
  return typeof v === "string" && v.startsWith("http");
}

function guessFastUrlFromKey(key) {
  // fallback immédiat (sans attendre le presign)
  if (!key) return "/default.jpg";
  if (isHttpUrl(key)) return key;
  return `/uploads/${key}`;
}

async function getPresignedUrlsBatch(keys) {
  const cleaned = Array.from(new Set((keys || []).filter(Boolean)));

  if (!cleaned.length) return {};

  // si tout est déjà en cache => pas de fetch
  const now = Date.now();
  let allCached = true;
  for (const k of cleaned) {
    const c = presignCache.get(k);
    if (!c || c.exp <= now) {
      allCached = false;
      break;
    }
  }
  if (allCached) {
    const out = {};
    for (const k of cleaned) out[k] = presignCache.get(k).url;
    return out;
  }

  const batchKey = cleaned.join("|");
  if (presignBatchInflight.has(batchKey)) return presignBatchInflight.get(batchKey);

  const p = fetch("/api/photos/presign-batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ keys: cleaned }),
    credentials: "include",
    keepalive: true,
  })
    .then((r) => r.json())
    .then((data) => {
      const urls = data?.urls || {};
      const now2 = Date.now();

      // hydrate cache
      for (const k of cleaned) {
        const url = urls[k];
        if (url && typeof url === "string") {
          presignCache.set(k, { url, exp: now2 + PRESIGN_TTL_MS });
        }
      }

      // retourne une map key->url (avec fallback si absent)
      const out = {};
      for (const k of cleaned) out[k] = urls[k] || guessFastUrlFromKey(k);
      return out;
    })
    .catch(() => {
      // fallback : tout en /uploads
      const out = {};
      for (const k of cleaned) out[k] = guessFastUrlFromKey(k);
      return out;
    })
    .finally(() => presignBatchInflight.delete(batchKey));

  presignBatchInflight.set(batchKey, p);
  return p;
}

/* -------------------------------------------------------------------------- */
/* --- Hook pour les photos présignées (ULTRA rapide) ---                     */
/* -------------------------------------------------------------------------- */
function usePresignedPhotos(participants) {
  const [photoUrls, setPhotoUrls] = useState({});
  const abortRef = useRef(null);

  // ✅ dépendance stable
  const participantsKey = useMemo(() => {
    return (participants || [])
      .map((p) => `${p?.id || "x"}:${p?.photoUrl || ""}`)
      .join("|");
  }, [participants]);

  useEffect(() => {
    let canceled = false;

    // abort previous batch fetch
    if (abortRef.current) abortRef.current.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    async function hydrate(list) {
      if (!list || list.length === 0) return;

      // 0) mise en place immédiate (fallback /uploads ou http) pour éviter l’attente
      const immediate = {};
      for (const p of list) {
        if (!p?.id) continue;
        const key = p.photoUrl;
        if (!key) {
          immediate[p.id] = "/default.jpg";
          continue;
        }
        // si déjà en cache => instant
        const cached = presignCache.get(key);
        if (cached && cached.exp > Date.now()) {
          immediate[p.id] = cached.url;
        } else {
          immediate[p.id] = guessFastUrlFromKey(key);
        }
      }
      if (!canceled && Object.keys(immediate).length) {
        setPhotoUrls((prev) => ({ ...prev, ...immediate }));
      }

      // 1) batch presign uniquement pour les keys non-http, non vides, non expirées
      const keysToPresign = [];
      for (const p of list) {
        const key = p?.photoUrl;
        if (!key) continue;
        if (isHttpUrl(key)) continue;
        const cached = presignCache.get(key);
        if (cached && cached.exp > Date.now()) continue;
        keysToPresign.push(key);
      }

      if (!keysToPresign.length) return;

      // ⚠️ IMPORTANT: on ne passe pas signal au fetch ci-dessus (keepalive + next),
      // mais on stoppe l'apply state via canceled
      const map = await getPresignedUrlsBatch(keysToPresign);

      if (canceled) return;

      const next = {};
      for (const p of list) {
        if (!p?.id) continue;
        const key = p.photoUrl;
        if (!key) continue;
        if (isHttpUrl(key)) continue;
        const url = map[key];
        if (url) next[p.id] = url;
      }

      if (Object.keys(next).length) {
        setPhotoUrls((prev) => ({ ...prev, ...next }));
      }
    }

    if (participants && participants.length > 0) {
      // uniq par id
      const uniq = [];
      const seen = new Set();
      for (const p of participants) {
        if (!p?.id) continue;
        if (seen.has(p.id)) continue;
        seen.add(p.id);
        uniq.push(p);
      }

      // priorité : 2 premiers
      const priority = uniq.slice(0, 2);
      const rest = uniq.slice(2);

      // priorité ASAP (pas idle)
      hydrate(priority).catch(() => {});

      // reste en idle
      runIdle(() => hydrate(rest).catch(() => {}), 800);
    } else {
      setPhotoUrls({});
    }

    return () => {
      canceled = true;
      try {
        ac.abort();
      } catch {}
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
            const key = p.photoUrl;

            const url =
              photoUrls[p.id] ||
              (key ? guessFastUrlFromKey(key) : "/default.jpg");

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
