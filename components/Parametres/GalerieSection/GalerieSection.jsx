"use client";
import { useEffect, useState } from "react";

export default function GalerieSection({ utilisateurId }) {
  const [accesList, setAccesList] = useState([]);
  const [refusesList, setRefusesList] = useState([]);
  const [attenteList, setAttenteList] = useState([]);

  const [photoUrls, setPhotoUrls] = useState({}); // { userId: url }

  useEffect(() => {
    async function load() {
      try {
        const [accesRes, refusesRes, attenteRes] = await Promise.all([
          fetch(`/api/utilisateur/${utilisateurId}/galerie-privee/acces`, { cache: "no-store" }),
          fetch(`/api/utilisateur/${utilisateurId}/galerie-privee/refusees`, { cache: "no-store" }),
         fetch("/api/galerie-privee/demandes", { cache: "no-store" }),

        ]);

        const acces = await accesRes.json();
        const refuses = await refusesRes.json();
        const attente = await attenteRes.json();

        setAccesList(Array.isArray(acces) ? acces : []);
        setRefusesList(Array.isArray(refuses) ? refuses : []);
        setAttenteList(Array.isArray(attente) ? attente : []);
      } catch (e) {
        console.error("Erreur chargement galerie section", e);
      }
    }

    if (utilisateurId) load();
  }, [utilisateurId]);

  // Résout les URLs des avatars pour les 3 listes
  useEffect(() => {
    let cancelled = false;

    async function resolvePhotos() {
      const all = [...accesList, ...refusesList, ...attenteList];
      const next = {};

      await Promise.all(
        all.map(async (d) => {
          const u = d?.demandeur;
          if (!u?.id) return;

          // si déjà résolu, on saute
          if (photoUrls[u.id]) return;

          const keyOrUrl = u.photoUrl;

          if (!keyOrUrl) {
            next[u.id] = "/images/default-avatar.png";
            return;
          }

          if (typeof keyOrUrl === "string" && keyOrUrl.startsWith("http")) {
            next[u.id] = keyOrUrl;
            return;
          }

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

      if (!cancelled && Object.keys(next).length) {
        setPhotoUrls((prev) => ({ ...prev, ...next }));
      }
    }

    if (accesList.length || refusesList.length || attenteList.length) resolvePhotos();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accesList, refusesList, attenteList]);

  const avatarSrc = (u) => photoUrls[u?.id] || "/images/default-avatar.png";

  const refreshAcces = async () => {
    try {
      const res = await fetch(`/api/utilisateur/${utilisateurId}/galerie-privee/acces`, {
        cache: "no-store",
      });
      const updated = await res.json();
      setAccesList(Array.isArray(updated) ? updated : []);
    } catch (e) {
      console.error("Erreur refresh acces", e);
    }
  };

  const retirerAcces = async (demandeId) => {
    try {
      await fetch(`/api/demandes-acces/${demandeId}/supprimer`, { method: "DELETE" });
      setAccesList((prev) => prev.filter((d) => d.id !== demandeId));
    } catch (e) {
      console.error("Erreur retirer accès", e);
    }
  };

  const accorderAcces = async (demandeId) => {
    try {
      await fetch(`/api/demandes-acces/${demandeId}/accepter`, { method: "PATCH" });

      // peut venir de "refusées" OU de "attente"
      setRefusesList((prev) => prev.filter((d) => d.id !== demandeId));
      setAttenteList((prev) => prev.filter((d) => d.id !== demandeId));

      await refreshAcces();
    } catch (e) {
      console.error("Erreur accorder accès", e);
    }
  };

  const refuserAcces = async (demandeId) => {
    try {
      await fetch(`/api/demandes-acces/${demandeId}/refuser`, { method: "PATCH" });

      // on enlève de "attente"
      setAttenteList((prev) => prev.filter((d) => d.id !== demandeId));

      // et on recharge la liste refusées (simple et fiable)
      const res = await fetch(`/api/utilisateur/${utilisateurId}/galerie-privee/refusees`, {
        cache: "no-store",
      });
      const updated = await res.json();
      setRefusesList(Array.isArray(updated) ? updated : []);
    } catch (e) {
      console.error("Erreur refuser accès", e);
    }
  };

  return (
    <div>
      {/* -------------------- EN ATTENTE -------------------- */}
      <h2>Demandes d&apos;accès en attente</h2>

      {attenteList.length === 0 ? (
        <p>Aucune demande en attente.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {attenteList.map((d) => (
            <li
              key={d.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 0",
              }}
            >
              <img
                src={avatarSrc(d.demandeur)}
                width={40}
                height={40}
                style={{ borderRadius: "50%", objectFit: "cover" }}
                alt={`Avatar de ${d.demandeur?.pseudo || "utilisateur"}`}
                onError={(e) => {
                  e.currentTarget.src = "/images/default-avatar.png";
                }}
              />
              <span style={{ flex: 1 }}>{d.demandeur?.pseudo}</span>

              <button onClick={() => accorderAcces(d.id)}>Accepter</button>
              <button onClick={() => refuserAcces(d.id)}>Refuser</button>
            </li>
          ))}
        </ul>
      )}

      {/* -------------------- ACCÈS ACCORDÉS -------------------- */}
      <h2 style={{ marginTop: "2rem" }}>Utilisateurs ayant accès à votre galerie privée</h2>

      {accesList.length === 0 ? (
        <p>Aucun accès accordé pour le moment.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {accesList.map((d) => (
            <li
              key={d.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 0",
              }}
            >
              <img
                src={avatarSrc(d.demandeur)}
                width={40}
                height={40}
                style={{ borderRadius: "50%", objectFit: "cover" }}
                alt={`Avatar de ${d.demandeur?.pseudo || "utilisateur"}`}
                onError={(e) => {
                  e.currentTarget.src = "/images/default-avatar.png";
                }}
              />
              <span style={{ flex: 1 }}>{d.demandeur?.pseudo}</span>
              <button onClick={() => retirerAcces(d.id)}>Retirer l&apos;accès</button>
            </li>
          ))}
        </ul>
      )}

      {/* -------------------- REFUSÉES -------------------- */}
      <h2 style={{ marginTop: "2rem" }}>Demandes refusées</h2>

      {refusesList.length === 0 ? (
        <p>Aucune demande refusée.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {refusesList.map((d) => (
            <li
              key={d.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 0",
              }}
            >
              <img
                src={avatarSrc(d.demandeur)}
                width={40}
                height={40}
                style={{ borderRadius: "50%", objectFit: "cover" }}
                alt={`Avatar de ${d.demandeur?.pseudo || "utilisateur"}`}
                onError={(e) => {
                  e.currentTarget.src = "/images/default-avatar.png";
                }}
              />
              <span style={{ flex: 1 }}>{d.demandeur?.pseudo}</span>
              <button onClick={() => accorderAcces(d.id)}>Accorder l&apos;accès</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
