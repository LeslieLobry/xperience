"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import "./ProfilsDisplay.css";
import { useOnlineStatus } from "../../context/OnlineStatusContext";
import { getUserDisplayStatus } from "../../lib/getUserDisplayStatus";
import { formatLocationLabel } from "../../lib/formatLocationLabel";
// shuffle stable
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

function getTargetUserId(u) {
  const id = u?.id ?? u?.utilisateurId ?? u?.userId ?? null;
  return id != null ? String(id) : null;
}

export default function ProfilsDisplay({ profils, afficherPlus = false }) {
  const { ready, onlineIds, isOnline, debug } = useOnlineStatus();

  const [filtrerEnLigne, setFiltrerEnLigne] = useState(false);
  const [filtrerProches, setFiltrerProches] = useState(false);
  const [distance, setDistance] = useState(20);

  const [loading, setLoading] = useState(false);
  const [profilsAffiches, setProfilsAffiches] = useState(profils || []);
  const [photoUrls, setPhotoUrls] = useState({});

  const instanceRef = useRef(
    Math.random().toString(16).slice(2, 6) +
      "-" +
      Date.now().toString(16).slice(-4)
  );

  const seedRef = useRef(null);
  if (seedRef.current === null) seedRef.current = Date.now().toString();

  const baseProfilsRef = useRef(profils || []);

  useEffect(() => {
    baseProfilsRef.current = profils || [];

    if (!filtrerEnLigne && !filtrerProches) {
      setProfilsAffiches(profils || []);
    }

    console.log(
      `[ProfilsDisplay ${instanceRef.current}] props.profils len=`,
      (profils || []).length
    );
  }, [profils, filtrerEnLigne, filtrerProches]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const online = params.get("online");

    if (online === "1" || online === "true") {
      setFiltrerEnLigne(true);
    }
  }, []);

  useEffect(() => {
    console.log(`[ProfilsDisplay ${instanceRef.current}] STATE`, {
      filtrerEnLigne,
      filtrerProches,
      loading,
      ready,
      onlineLen: onlineIds.length,
      onlineSample: onlineIds.slice(0, 20),
      debug,
    });
  }, [filtrerEnLigne, filtrerProches, loading, ready, onlineIds, debug]);

  // Charge toute la liste online quand filtre actif
  useEffect(() => {
    let cancelled = false;

    async function loadAllOnline() {
      if (!filtrerEnLigne || filtrerProches) return;
      if (!ready) return;

      setLoading(true);

      try {
        const res = await fetch("/api/profils-online", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            ids: onlineIds,
          }),
        });

        const data = await res.json().catch(() => null);

        if (cancelled) return;

        if (res.ok && data?.ok) {
          const list = Array.isArray(data.utilisateurs) ? data.utilisateurs : [];
          setProfilsAffiches(list);
        } else {
          setProfilsAffiches([]);
        }
      } catch (e) {
        console.error(
          `[ProfilsDisplay ${instanceRef.current}] erreur /api/profils-online`,
          e
        );
        if (!cancelled) setProfilsAffiches([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadAllOnline();

    return () => {
      cancelled = true;
    };
  }, [filtrerEnLigne, filtrerProches, onlineIds, ready]);

  const profilsFiltres = useMemo(() => {
    let base = Array.isArray(profilsAffiches) ? [...profilsAffiches] : [];

    if (filtrerEnLigne && !filtrerProches) {
      base = base.filter((u) => {
        const targetId = getTargetUserId(u);
        if (!targetId) return false;
        return getUserDisplayStatus(u, isOnline(targetId)) === "en_ligne";
      });
    }

    return stableShuffle(base, seedRef.current);
  }, [profilsAffiches, filtrerEnLigne, filtrerProches, isOnline]);

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

            const data = await res.json().catch(() => null);
            newUrls[targetId] = data?.url || "/default.jpg";
          } catch {
            newUrls[targetId] = "/default.jpg";
          }
        })
      );

      if (!canceled) {
        setPhotoUrls((prev) => {
          const merged = { ...prev };

          for (const [id, url] of Object.entries(newUrls)) {
            if (!merged[id]) {
              merged[id] = url;
            }
          }

          return merged;
        });
      }
    };

    if (profilsFiltres.length > 0) {
      loadAllUrls();
    }

    return () => {
      canceled = true;
    };
  }, [profilsFiltres]);

  const handleToggleProches = async (active, customDistance) => {
    setFiltrerProches(active);

    if (active) {
      setFiltrerEnLigne(false);
    }

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

            const data = await res.json().catch(() => null);

            const list = Array.isArray(data)
              ? data
              : Array.isArray(data?.proches)
              ? data.proches
              : [];

            setProfilsAffiches(list);
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
      setLoading(false);
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
                setFiltrerEnLigne((prev) => {
                  const next = !prev;

                  if (!next) {
                    setLoading(false);
                    setProfilsAffiches(baseProfilsRef.current || []);
                  }

                  return next;
                });
              }}
            />
            <span className="slider"></span>
            En ligne
          </label>

          <label
            className="toggle-label"
            style={{ alignItems: "center", gap: 8 }}
          >
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

            <span style={{ minWidth: 32, display: "inline-block" }}>
              {distance} km
            </span>
          </label>
        </div>
      </div>

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

              const statutEff = getUserDisplayStatus(user, isOnline(targetId));
              const routeId = user?.id ?? user?.utilisateurId ?? targetId;

              return (
                <Link
                  href={`/profil/${routeId}`}
                  key={targetId}
                  className="profil-card-link"
                >
                  <div className="profil-card">
                    <span
                      className={`statut-badge ${
                        statutEff === "en_ligne" ? "en-ligne" : "hors-ligne"
                      }`}
                      title={
                        statutEff === "en_ligne" ? "En ligne" : "Hors ligne"
                      }
                    />

                    <div className="profil-photo-wrapper">
                      <img
                        src={photoUrls[targetId] || "/default.jpg"}
                        alt={user.pseudo || "Profil"}
                        className="profil-photo"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = "/default.jpg";
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
                      {user.pseudo
                        ? user.pseudo.charAt(0).toUpperCase() +
                          user.pseudo.slice(1).toLowerCase()
                        : "Profil"}
                    </h2>

                    <p className="profil-card-details">
  {user.age} ans{formatLocationLabel(user) ? ` - ${formatLocationLabel(user)}` : ""}
</p>
                    <p className="profil-card-details-type">{user.type}</p>

                    {user.distance != null && Number.isFinite(user.distance) && (
                      <p
                        className="profil-card-details"
                        style={{ color: "#999" }}
                      >
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