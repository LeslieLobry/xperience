"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import "./ProfilsDisplay.css";
import { useOnlineStatus } from "../../context/OnlineStatusContext";

// ✅ shuffle stable : même input => même ordre
function stableShuffle(list, seed) {
  const arr = Array.isArray(list) ? [...list] : [];
  const hash = (str) => {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  };

  return arr
    .map((u) => {
      const id = String(u?.id ?? u?.utilisateurId ?? u?.userId ?? "");
      return { u, k: hash(`${seed}:${id}`) };
    })
    .sort((a, b) => a.k - b.k)
    .map((x) => x.u);
}

// (fallback) calcul basé lastSeenAt/statutAuto
function computeStatut(u) {
  const ONLINE_WINDOW_MS = 5 * 60 * 1000;

  if (u?.statutAuto) {
    if (!u?.lastSeenAt) return "hors_ligne";
    const seen = new Date(u.lastSeenAt).getTime();
    if (!Number.isFinite(seen)) return "hors_ligne";
    return Date.now() - seen <= ONLINE_WINDOW_MS ? "en_ligne" : "hors_ligne";
  }

  return u?.statut === "en_ligne" ? "en_ligne" : "hors_ligne";
}

function getTargetUserId(u) {
  const id = u?.id ?? u?.utilisateurId ?? u?.userId ?? null;
  return id != null ? String(id) : null;
}

export default function ProfilsDisplay({ profils, afficherPlus = false }) {
  const { counts } = useOnlineStatus();

  const [filtrerEnLigne, setFiltrerEnLigne] = useState(false);
  const [profilsAffiches, setProfilsAffiches] = useState(profils);
  const [loading, setLoading] = useState(false);

  const [filtrerProches, setFiltrerProches] = useState(false);
  const [distance, setDistance] = useState(20);

  const [photoUrls, setPhotoUrls] = useState({});

  // ✅ seed stable
  const seedRef = useRef(null);
  if (seedRef.current === null) seedRef.current = Date.now().toString();

  // ✅ garder la liste "normale"
  const baseProfilsRef = useRef(profils);
  useEffect(() => {
    baseProfilsRef.current = profils;
    if (!filtrerEnLigne && !filtrerProches) setProfilsAffiches(profils);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profils]);

  // ✅ Active filtre si ?online=1
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const online = params.get("online");
    if (online === "1" || online === "true") setFiltrerEnLigne(true);
  }, []);

  // ✅ ids online STABLES (memo) + key stable (string) => évite boucle
  const onlineIds = useMemo(() => {
    return Object.keys(counts || {}).map(String).sort();
  }, [counts]);

  const onlineKey = useMemo(() => onlineIds.join(","), [onlineIds]);

  const presenceUsable = onlineIds.length > 0;

  // ✅ helper local
  const isOnlineViaCounts = (id) => !!counts?.[String(id)];

  // ✅ anti-spam fetch
  const lastKeyRef = useRef("");
  const abortRef = useRef(null);

  // ✅ Quand on active "En ligne" : fetch liste online via API
  // ✅ IMPORTANT : dépendances stables via onlineKey
  useEffect(() => {
    let cancelled = false;

    async function loadOnlineFromApi() {
      // mode off -> reset propre
      if (!filtrerEnLigne || filtrerProches) {
        // si on sort du mode en ligne, on revient à la liste normale
        if (!filtrerProches) setProfilsAffiches(baseProfilsRef.current || []);
        setLoading(false);
        lastKeyRef.current = "";
        return;
      }

      // pas de présence : on ne fetch pas (et on ne bloque pas)
      if (!presenceUsable) {
        setLoading(false);
        return;
      }

      // ✅ si mêmes IDs -> ne refetch pas
      if (lastKeyRef.current === onlineKey) {
        setLoading(false);
        return;
      }
      lastKeyRef.current = onlineKey;

      // abort ancien fetch
      if (abortRef.current) {
        try {
          abortRef.current.abort();
        } catch {}
      }
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      try {
        const res = await fetch("/api/profils-online", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ ids: onlineIds }),
          signal: controller.signal,
        });

        const data = await res.json().catch(() => null);
        if (cancelled) return;

        if (res.ok && data?.ok) {
          setProfilsAffiches(Array.isArray(data.utilisateurs) ? data.utilisateurs : []);
        } else {
          setProfilsAffiches([]);
        }
      } catch (e) {
        if (e?.name === "AbortError") return;
        console.error("Erreur /api/profils-online:", e);
        if (!cancelled) setProfilsAffiches([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadOnlineFromApi();

    return () => {
      cancelled = true;
    };
  }, [filtrerEnLigne, filtrerProches, presenceUsable, onlineKey, onlineIds]);

  // ✅ FILTRAGE :
  // - si "En ligne" activé :
  //    - si présenceUsable => profilsAffiches = ceux de l'API (déjà filtrés)
  //    - sinon => fallback DB computeStatut (pas d'écran vide)
  const profilsFiltres = useMemo(() => {
    const base = Array.isArray(profilsAffiches) ? profilsAffiches : [];

    if (!filtrerEnLigne) return stableShuffle(base, seedRef.current);

    if (presenceUsable) return stableShuffle(base, seedRef.current);

    const fallback = base.filter((p) => computeStatut(p) === "en_ligne");
    return stableShuffle(fallback, seedRef.current);
  }, [filtrerEnLigne, presenceUsable, profilsAffiches]);

  // Presigned URLs
  useEffect(() => {
    let canceled = false;

    const loadAllUrls = async () => {
      const newUrls = {};

      await Promise.all(
        profilsFiltres.map(async (user) => {
          const targetId = getTargetUserId(user);
          if (!targetId) return;

          if (!user?.photoUrl) {
            newUrls[targetId] = "/default.jpg";
            return;
          }

          if (photoUrls[targetId]) {
            newUrls[targetId] = photoUrls[targetId];
            return;
          }

          if (user.photoUrl.startsWith("http")) {
            newUrls[targetId] = user.photoUrl;
            return;
          }

          try {
            const res = await fetch("/api/photos/presign", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ key: user.photoUrl }),
            });

            const data = await res.json();
            newUrls[targetId] = data.url || "/default.jpg";
          } catch {
            newUrls[targetId] = "/default.jpg";
          }
        })
      );

      if (!canceled) setPhotoUrls((prev) => ({ ...prev, ...newUrls }));
    };

    loadAllUrls();
    return () => {
      canceled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profilsFiltres]);

  const handleToggleProches = async (active, customDistance) => {
    setFiltrerProches(active);

    // ✅ priorité : "près de moi" coupe "en ligne"
    if (active) setFiltrerEnLigne(false);

    if (active) {
      setLoading(true);

      if (!navigator.geolocation) {
        console.error("Géolocalisation non supportée");
        setLoading(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;

          try {
            const res = await fetch("/api/profils-proches", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                latitude,
                longitude,
                distance: customDistance || distance,
              }),
            });

            const data = await res.json();
            setProfilsAffiches(data);
          } catch (err) {
            console.error("Erreur chargement profils proches :", err);
          } finally {
            setLoading(false);
          }
        },
        (error) => {
          console.error("Erreur géolocalisation :", error);
          setLoading(false);
        }
      );
    } else {
      setProfilsAffiches(baseProfilsRef.current || []);
    }
  };

  const handleDistanceChange = (e) => {
    const val = Number(e.target.value);
    setDistance(val);
    if (filtrerProches) handleToggleProches(true, val);
  };

  const hrefAfficherPlus = filtrerEnLigne
    ? { pathname: "/profils", query: { online: "1" } }
    : "/profils";

  return (
    <div className="profil-list1">
      <h1 className="profil-list1-title">Profils</h1>

      <div className="profil-toggle-wrapper">
        <div className="toggle-box">
          <label className={`toggle-label ${filtrerEnLigne ? "active" : ""}`}>
            <input
              type="checkbox"
              checked={filtrerEnLigne}
              onChange={() => {
                setFiltrerProches(false);
                setFiltrerEnLigne((prev) => !prev);

                // si on coupe, on revient à la liste normale
                if (filtrerEnLigne) {
                  setProfilsAffiches(baseProfilsRef.current || []);
                  lastKeyRef.current = "";
                }
              }}
            />
            <span className="slider"></span>
            En ligne
          </label>

          <label className="toggle-label" style={{ alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={filtrerProches}
              onChange={(e) => handleToggleProches(e.target.checked)}
            />
            <span className="slider"></span>
            Près de moi
            <input
              type="range"
              min={5}
              max={300}
              step={1}
              value={distance}
              onChange={handleDistanceChange}
              disabled={!filtrerProches}
              className="profil-range"
              style={{
                margin: "0 10px",
                width: 120,
                verticalAlign: "middle",
                opacity: filtrerProches ? 1 : 0.5,
                pointerEvents: filtrerProches ? "auto" : "none",
              }}
            />
            <span style={{ minWidth: 32, display: "inline-block" }}>{distance} km</span>
          </label>
        </div>
      </div>

      {/* ✅ statut non bloquant */}
      {filtrerEnLigne && !presenceUsable && (
        <p style={{ marginTop: 10, opacity: 0.8 }}>
          Synchronisation des statuts en ligne…
        </p>
      )}

      {loading ? (
        <p>Chargement…</p>
      ) : (
        <div className="grid-profil">
          {profilsFiltres.length === 0 ? (
            <p>Aucun profil trouvé pour ce filtre.</p>
          ) : (
            profilsFiltres.map((user) => {
              const targetId = getTargetUserId(user);
              if (!targetId) return null;

              const statutEff = presenceUsable
                ? isOnlineViaCounts(targetId)
                  ? "en_ligne"
                  : "hors_ligne"
                : computeStatut(user);

              const routeId = user?.id ?? user?.utilisateurId ?? targetId;

              return (
                <Link href={`/profil/${routeId}`} key={targetId} className="profil-card-link">
                  <div className="profil-card">
                    <span
                      className={`statut-badge ${statutEff === "en_ligne" ? "en-ligne" : "hors-ligne"}`}
                      title={statutEff === "en_ligne" ? "En ligne" : "Hors ligne"}
                    />

                    <div className="profil-photo-wrapper">
                      <img
                        src={photoUrls[targetId] || "/default.jpg"}
                        alt={user.pseudo}
                        className="profil-photo"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = "/default.jpg";
                        }}
                      />

                      {user.verificationIdentiteStatut && (
                        <img
                          src="/Profilverif.png"
                          alt="Vérifié"
                          className="badge-verifie-overlay"
                          title="Profil vérifié"
                        />
                      )}
                    </div>

                    <h2 className="profil-card-title">
                      {user.pseudo?.charAt(0)?.toUpperCase() + user.pseudo?.slice(1)?.toLowerCase()}
                    </h2>

                    <p className="profil-card-details">
                      {user.age} ans - {user.localisation}
                    </p>

                    <p className="profil-card-details-type">{user.type}</p>

                    {user.distance && (
                      <p className="profil-card-details" style={{ color: "#999" }}>
                        {user.distance.toFixed(1)} km de vous
                      </p>
                    )}
                  </div>
                </Link>
              );
            })
          )}
        </div>
      )}

      {afficherPlus && !filtrerProches && (
        <Link href={hrefAfficherPlus} className="afficher-plus">
          Afficher plus
        </Link>
      )}
    </div>
  );
}
