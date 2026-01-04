"use client";
import { useEffect, useState } from "react";

export default function GalerieSection({ utilisateurId }) {
  const [accesList, setAccesList] = useState([]);
  const [refusesList, setRefusesList] = useState([]);
  const [attenteList, setAttenteList] = useState([]);

  // ✅ NOUVEAU : côté “moi” (demandeur)
  const [mesAccesList, setMesAccesList] = useState([]); // statut = ACCEPTEE
  const [mesDemandesList, setMesDemandesList] = useState([]); // EN_ATTENTE + REFUSEE

  const [photoUrls, setPhotoUrls] = useState({}); // { userId: url }

  useEffect(() => {
    async function load() {
      try {
        const [accesRes, refusesRes, attenteRes, mesAccesRes, mesDemandesRes] = await Promise.all([
          fetch(`/api/utilisateur/${utilisateurId}/galerie-privee/acces`, { cache: "no-store" }),
          fetch(`/api/utilisateur/${utilisateurId}/galerie-privee/refusees`, { cache: "no-store" }),
          fetch("/api/galerie-privee/demandes", { cache: "no-store" }),

          // ✅ NOUVEAU
          fetch("/api/galerie-privee/mes-acces", { cache: "no-store" }),
          fetch("/api/galerie-privee/mes-demandes", { cache: "no-store" }),
        ]);

        const acces = await accesRes.json();
        const refuses = await refusesRes.json();
        const attente = await attenteRes.json();

        const mesAcces = await mesAccesRes.json();
        const mesDemandes = await mesDemandesRes.json();

        setAccesList(Array.isArray(acces) ? acces : []);
        setRefusesList(Array.isArray(refuses) ? refuses : []);
        setAttenteList(Array.isArray(attente) ? attente : []);

        setMesAccesList(Array.isArray(mesAcces) ? mesAcces : []);
        setMesDemandesList(Array.isArray(mesDemandes) ? mesDemandes : []);
      } catch (e) {
        console.error("Erreur chargement galerie section", e);
      }
    }

    if (utilisateurId) load();
  }, [utilisateurId]);

  // Résout les URLs des avatars pour TOUTES les listes (demandeur + proprietaire)
  useEffect(() => {
    let cancelled = false;

    async function resolvePhotos() {
      // 3 listes “ma galerie” => avatar = demandeur
      const allDemanders = [...accesList, ...refusesList, ...attenteList]
        .map((d) => d?.demandeur)
        .filter(Boolean);

      // 2 listes “mes accès/demandes” => avatar = proprietaire
      const allOwners = [...mesAccesList, ...mesDemandesList]
        .map((d) => d?.proprietaire)
        .filter(Boolean);

      const users = [...allDemanders, ...allOwners];

      const next = {};

      await Promise.all(
        users.map(async (u) => {
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

    if (
      accesList.length ||
      refusesList.length ||
      attenteList.length ||
      mesAccesList.length ||
      mesDemandesList.length
    ) {
      resolvePhotos();
    }

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accesList, refusesList, attenteList, mesAccesList, mesDemandesList]);

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

  const refreshRefusees = async () => {
    try {
      const res = await fetch(`/api/utilisateur/${utilisateurId}/galerie-privee/refusees`, {
        cache: "no-store",
      });
      const updated = await res.json();
      setRefusesList(Array.isArray(updated) ? updated : []);
    } catch (e) {
      console.error("Erreur refresh refusées", e);
    }
  };

  const refreshMes = async () => {
    try {
      const [mesAccesRes, mesDemandesRes] = await Promise.all([
        fetch("/api/galerie-privee/mes-acces", { cache: "no-store" }),
        fetch("/api/galerie-privee/mes-demandes", { cache: "no-store" }),
      ]);

      const mesAcces = await mesAccesRes.json();
      const mesDemandes = await mesDemandesRes.json();

      setMesAccesList(Array.isArray(mesAcces) ? mesAcces : []);
      setMesDemandesList(Array.isArray(mesDemandes) ? mesDemandes : []);
    } catch (e) {
      console.error("Erreur refresh mes accès/demandes", e);
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

      // et on recharge la liste refusées
      await refreshRefusees();
    } catch (e) {
      console.error("Erreur refuser accès", e);
    }
  };

  // ✅ NOUVEAU : annuler une demande (EN_ATTENTE) / quitter une galerie (ACCEPTEE) / supprimer (REFUSEE)
  const annulerOuQuitter = async (demandeId) => {
    try {
      await fetch(`/api/galerie-privee/mes-demandes/${demandeId}`, { method: "DELETE" });
      await refreshMes();
    } catch (e) {
      console.error("Erreur annuler/quitter", e);
    }
  };

  return (
    <div>
      {/* -------------------- EN ATTENTE (ma galerie) -------------------- */}
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

      {/* -------------------- ACCÈS ACCORDÉS (ma galerie) -------------------- */}
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

      {/* -------------------- REFUSÉES (ma galerie) -------------------- */}
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

      {/* ==================== NOUVEAU : MES ACCÈS ==================== */}
      <h2 style={{ marginTop: "2rem" }}>Mes accès aux galeries privées</h2>

      {mesAccesList.length === 0 ? (
        <p>Vous n&apos;avez accès à aucune galerie privée.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {mesAccesList.map((d) => (
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
                src={avatarSrc(d.proprietaire)}
                width={40}
                height={40}
                style={{ borderRadius: "50%", objectFit: "cover" }}
                alt={`Avatar de ${d.proprietaire?.pseudo || "utilisateur"}`}
                onError={(e) => {
                  e.currentTarget.src = "/images/default-avatar.png";
                }}
              />
              <span style={{ flex: 1 }}>
                {d.proprietaire?.pseudo} — <strong>Accès accordé</strong>
              </span>
              <button onClick={() => annulerOuQuitter(d.id)}>Quitter</button>
            </li>
          ))}
        </ul>
      )}

      {/* ==================== NOUVEAU : MES DEMANDES ==================== */}
      <h2 style={{ marginTop: "2rem" }}>Mes demandes d&apos;accès envoyées</h2>

      {mesDemandesList.length === 0 ? (
        <p>Aucune demande envoyée.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {mesDemandesList.map((d) => (
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
                src={avatarSrc(d.proprietaire)}
                width={40}
                height={40}
                style={{ borderRadius: "50%", objectFit: "cover" }}
                alt={`Avatar de ${d.proprietaire?.pseudo || "utilisateur"}`}
                onError={(e) => {
                  e.currentTarget.src = "/images/default-avatar.png";
                }}
              />
              <span style={{ flex: 1 }}>
                {d.proprietaire?.pseudo} —{" "}
                {d.statut === "EN_ATTENTE" ? (
                  <strong>En attente</strong>
                ) : (
                  <strong>Refusée</strong>
                )}
              </span>

              {d.statut === "EN_ATTENTE" ? (
                <button onClick={() => annulerOuQuitter(d.id)}>Annuler</button>
              ) : (
                <button onClick={() => annulerOuQuitter(d.id)}>Supprimer</button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
