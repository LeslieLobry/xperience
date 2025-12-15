"use client";
import { useEffect, useState } from "react";

export default function DemandesAccesGalerie() {
  const [demandes, setDemandes] = useState([]);
  const [noGalerie, setNoGalerie] = useState(false);
  const [photoUrls, setPhotoUrls] = useState({}); // { userId: url }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/galerie-privee/demandes", { cache: "no-store" });
        const data = await res.json();

        if (data?.error === "NO_GALERIE") {
          if (!cancelled) setNoGalerie(true);
          return;
        }

        if (!cancelled) setDemandes(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("Erreur chargement demandes", e);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  // Dès qu'on a des demandes, on résout les URLs des avatars (S3 key -> presigned URL)
  useEffect(() => {
    let cancelled = false;

    async function resolvePhotos() {
      const next = {};

      await Promise.all(
        demandes.map(async (d) => {
          const u = d?.demandeur;
          if (!u?.id) return;

          const keyOrUrl = u.photoUrl;

          // fallback
          if (!keyOrUrl) {
            next[u.id] = "/images/default-avatar.png";
            return;
          }

          // déjà une URL complète
          if (typeof keyOrUrl === "string" && keyOrUrl.startsWith("http")) {
            next[u.id] = keyOrUrl;
            return;
          }

          // sinon => clé S3 => presign
          try {
            const pres = await fetch("/api/photos/presign", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ key: keyOrUrl }),
            });
            const presData = await pres.json();
            next[u.id] = presData?.url || "/images/default-avatar.png";
          } catch (e) {
            console.error("Erreur presign", e);
            next[u.id] = "/images/default-avatar.png";
          }
        })
      );

      if (!cancelled) {
        setPhotoUrls((prev) => ({ ...prev, ...next }));
      }
    }

    if (demandes.length) resolvePhotos();
    return () => { cancelled = true; };
  }, [demandes]);

  const handleAction = async (id, action) => {
    try {
      await fetch(`/api/galerie-privee/demandes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statut: action }),
      });
      setDemandes((prev) => prev.filter((d) => d.id !== id));
    } catch (e) {
      console.error("Erreur action demande", e);
    }
  };

  if (noGalerie) {
    return (
      <div className="profil-section">
        <h3 className="profil-section-title">Demandes d'accès à votre galerie privée</h3>
        <div style={{ textAlign: "center", padding: "1rem" }}>
          <p style={{ color: "#888", marginTop: "0.5rem" }}>
            Pas de galerie privée pour le moment.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="profil-section">
      <h3 className="profil-section-title">Demandes d'accès à votre galerie privée</h3>

      {demandes.length === 0 ? (
        <div style={{ textAlign: "center", padding: "1rem" }}>
          <p style={{ color: "#888", marginTop: "0.5rem" }}>
            Aucune demande en attente pour le moment.
          </p>
        </div>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {demandes.map((d) => {
            const u = d.demandeur;
            const src = photoUrls[u?.id] || "/images/default-avatar.png";

            return (
              <li
                key={d.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                  padding: "0.5rem 0",
                  borderBottom: "1px solid #ccc",
                }}
              >
                <img
                  src={src}
                  width={50}
                  height={50}
                  style={{ borderRadius: "50%", objectFit: "cover" }}
                  alt={`Avatar de ${u?.pseudo || "utilisateur"}`}
                  onError={(e) => {
                    e.currentTarget.src = "/images/default-avatar.png";
                  }}
                />
                <span style={{ flex: 1 }}>{u?.pseudo}</span>
                <button onClick={() => handleAction(d.id, "ACCEPTEE")}>Accepter</button>
                <button onClick={() => handleAction(d.id, "REFUSEE")}>Refuser</button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
