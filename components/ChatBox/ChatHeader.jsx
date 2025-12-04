import { useEffect, useState } from "react";
import Link from "next/link";
import { Phone, Video, X, Plus, ArrowLeft } from "lucide-react";
import "./ChatBox.css";

// --- Hook pour les photos présignées ---
function usePresignedPhotos(participants) {
  const [photoUrls, setPhotoUrls] = useState({});

  useEffect(() => {
    let canceled = false;

    async function fetchAll() {
      const result = {};

      await Promise.all(
        (participants || []).map(async (p) => {
          if (!p || !p.id) return;

          // 👀 log pour vérifier les données
          console.log("ChatHeader participant:", p);

          // On utilise photoUrl (c’est ce que tu as dans le log)
          const key = p.photoUrl;

          if (!key) {
            result[p.id] = "/default.jpg";
            return;
          }

          // Si c'est déjà une URL complète -> direct
          if (typeof key === "string" && key.startsWith("http")) {
            result[p.id] = key;
            return;
          }

          try {
            const res = await fetch("/api/photos/presign", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ key }),
            });
            const data = await res.json();

            // URL signée ou rien -> on met au moins quelque chose
            if (data?.url) {
              result[p.id] = data.url;
            } else {
              // 🔁 Fallback : si tes photos sont aussi accessibles en direct,
              // adapte éventuellement le préfixe ici.
              result[p.id] = `/uploads/${key}`;
            }
          } catch (e) {
            console.error("Erreur presign photo header:", e);
            // Fallback direct si possible
            result[p.id] = `/uploads/${key}`;
          }
        })
      );

      if (!canceled) {
        console.log("ChatHeader photoUrls calculés:", result);
        setPhotoUrls(result);
      }
    }

    if (participants && participants.length > 0) {
      fetchAll();
    } else {
      setPhotoUrls({});
    }

    return () => {
      canceled = true;
    };
  }, [participants]);

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
