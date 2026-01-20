// components/ProfilsDisplay/ProfilsDisplay.jsx
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

// ✅ mode invisible : le statut DB = préférence visible/invisible
// - "en_ligne" => visible
// - "hors_ligne" => invisible
function computeStatut(u) {
  return u?.statut === "en_ligne" ? "en_ligne" : "hors_ligne";
}

function getTargetUserId(u) {
  const id = u?.id ?? u?.utilisateurId ?? u?.userId ?? null;
  return id != null ? String(id) : null;
}

export default function ProfilsDisplay({ profils, afficherPlus = false }) {
  const { ready, counts, debug } = useOnlineStatus();

  const [filtrerEnLigne, setFiltrerEnLigne] = useState(false);
  const [filtrerProches, setFiltrerProches] = useState(false);
  const [distance, setDistance] = useState(20);

  const [loading, setLoading] = useState(false);
  const [profilsAffiches, setProfilsAffiches] = useState(profils || []);
  const [photoUrls, setPhotoUrls] = useState({});

  const instanceRef = useRef(
    Math.random().toString(16).slice(2, 6) + "-" + Date.now().toString(16).slice(-4)
  );

  // ✅ seed stable
  const seedRef = useRef(null);
  if (seedRef.current === null) seedRef.current = Date.now().toString();

  // ✅ garde la liste normale (paginated / server list) pour revenir dessus
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profils]);

  // ✅ Active filtre si ?online=1
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const online = params.get("online");
    if (online === "1" || online === "true") {
      console.log(
        `[ProfilsDisplay ${instanceRef.current}] init online param => true`
      );
      setFiltrerEnLigne(true);

      // ✅ Filtre instantané (fallback DB) dès l'init si possible
      const base = baseProfilsRef.current || [];
      const instant = base.filter((u) => computeStatut(u) === "en_ligne");
      setProfilsAffiches(instant);
    }
  }, []);

  // ✅ ids présents sur Ably (tous les online du site)
  const countsIds = useMemo(() => {
    const ids = Object.keys(counts || {});
    ids.sort();
    return ids;
  }, [counts]);

  // ✅ présence utilisable si on a un set non vide (ta logique actuelle)
  // (Tu peux aussi baser ça sur `ready` si ton context est fiable)
  const presenceUsable = countsIds.length > 0;

  const countsKey = useMemo(() => countsIds.join(","), [countsIds]);

  // ✅ empêche refetch si on a déjà fetch pour ce set d'ids
  const lastFetchKeyRef = useRef("");

  // ✅ logs état général
  useEffect(() => {
    console.log(`[ProfilsDisplay ${instanceRef.current}] STATE`, {
      filtrerEnLigne,
      filtrerProches,
      loading,
      ready,
      presenceUsable,
      countsLen: countsIds.length,
      countsSample: countsIds.slice(0, 15),
      debug,
    });
  }, [
    filtrerEnLigne,
    filtrerProches,
    loading,
    ready,
    presenceUsable,
    countsIds,
    debug,
  ]);

  // ✅ Quand "En ligne" est activé, on charge TOUTE la liste online via API
  // ⚠️ Mais on ne bloque plus l'UI : on affiche d'abord un filtre fallback instantané,
  // puis Ably remplace par la liste exacte dès que presenceUsable devient true.
  useEffect(() => {
    let cancelled = false;

    async function loadAllOnline() {
      if (!filtrerEnLigne) {
        console.log(
          `[ProfilsDisplay ${instanceRef.current}] loadAllOnline skip: filtrerEnLigne=false`
        );
        return;
      }
      if (filtrerProches) {
        console.log(
          `[ProfilsDisplay ${instanceRef.current}] loadAllOnline skip: filtrerProches=true`
        );
        return;
      }

      if (!presenceUsable) {
        console.log(
          `[ProfilsDisplay ${instanceRef.current}] loadAllOnline wait: presenceUsable=false (Ably pas prêt). UI fallback déjà affichée.`
        );
        return;
      }

      const wantedKey = `online:${countsKey}`;
      if (lastFetchKeyRef.current === wantedKey) {
        console.log(
          `[ProfilsDisplay ${instanceRef.current}] loadAllOnline skip: same wantedKey`,
          wantedKey
        );
        return;
      }
      lastFetchKeyRef.current = wantedKey;

      console.log(
        `[ProfilsDisplay ${instanceRef.current}] loadAllOnline FETCH start`,
        {
          wantedKey,
          idsLen: countsIds.length,
          idsSample: countsIds.slice(0, 20),
        }
      );

      setLoading(true);
      try {
        const res = await fetch("/api/profils-online", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ ids: countsIds }),
        });

        const txt = await res.text();
        console.log(
          `[ProfilsDisplay ${instanceRef.current}] /api/profils-online status=`,
          res.status
        );
        console.log(
          `[ProfilsDisplay ${instanceRef.current}] /api/profils-online text=`,
          (txt || "").slice(0, 300)
        );

        let data = null;
        try {
          data = txt ? JSON.parse(txt) : null;
        } catch (e) {
          console.log(
            `[ProfilsDisplay ${instanceRef.current}] JSON parse FAILED`,
            e
          );
        }

        console.log(
          `[ProfilsDisplay ${instanceRef.current}] /api/profils-online data=`,
          data
        );

        if (cancelled) return;

        if (res.ok && data?.ok) {
          const list = Array.isArray(data.utilisateurs) ? data.utilisateurs : [];
          console.log(
            `[ProfilsDisplay ${instanceRef.current}] setProfilsAffiches len=`,
            list.length,
            "ids=",
            list.map((x) => x.id).slice(0, 30)
          );
          setProfilsAffiches(list);
        } else {
          console.log(
            `[ProfilsDisplay ${instanceRef.current}] API not ok => setProfilsAffiches([])`
          );
          setProfilsAffiches([]);
        }
      } catch (e) {
        console.error(
          `[ProfilsDisplay ${instanceRef.current}] Erreur /api/profils-online:`,
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
  }, [filtrerEnLigne, filtrerProches, presenceUsable, countsKey, countsIds]);

  // ✅ LISTE RENDUE
  const profilsFiltres = useMemo(() => {
    const base = Array.isArray(profilsAffiches) ? profilsAffiches : [];
    const shuffled = stableShuffle(base, seedRef.current);

    console.log(`[ProfilsDisplay ${instanceRef.current}] RENDER LIST`, {
      profilsAffichesLen: base.length,
      profilsFiltresLen: shuffled.length,
      sampleIds: shuffled.slice(0, 20).map((u) => getTargetUserId(u)),
    });

    return shuffled;
  }, [profilsAffiches]);

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

            const data = await res.json().catch(() => null);
            newUrls[targetId] = data?.url || "/default.jpg";
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
    console.log(`[ProfilsDisplay ${instanceRef.current}] Toggle PROCHES =>`, active);

    setFiltrerProches(active);

    // ✅ priorité proches => coupe online
    if (active) {
      setFiltrerEnLigne(false);
      lastFetchKeyRef.current = ""; // reset
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
            console.log(
              `[ProfilsDisplay ${instanceRef.current}] /api/profils-proches data=`,
              data
            );

            setProfilsAffiches(Array.isArray(data) ? data : []);
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

  // Debug online missing (conserve tes logs)
  const listIds = new Set(
    (profilsAffiches || []).map(getTargetUserId).filter(Boolean)
  );
  const onlineIds = Object.keys(counts || {});
  const missingOnline = onlineIds.filter((id) => !listIds.has(String(id)));

  console.log(
    "[ONLINE DEBUG] onlineIds=",
    onlineIds.length,
    "missingOnline=",
    missingOnline
  );

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
                console.log(
                  `[ProfilsDisplay ${instanceRef.current}] Toggle EN LIGNE click`
                );

                // coupe proches
                setFiltrerProches(false);

                setFiltrerEnLigne((prev) => {
                  const next = !prev;

                  if (next) {
                    // ✅ Filtre instantané dès l’activation (fallback DB)
                    const base = baseProfilsRef.current || [];
                    const instant = base.filter(
                      (u) => computeStatut(u) === "en_ligne"
                    );
                    setProfilsAffiches(instant);
                  } else {
                    // retour à la liste normale
                    lastFetchKeyRef.current = "";
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

              // ✅ Badge :
              // - fallback DB immédiat (visible/invisible)
              // - Ably override ensuite, MAIS respecte l'invisible
              const fallback = computeStatut(user); // visible/invisible depuis DB
              const ablyOnline = !!counts?.[String(targetId)];
              const isVisible = user?.statut === "en_ligne";

              const statutEff = presenceUsable
                ? ablyOnline && isVisible
                  ? "en_ligne"
                  : "hors_ligne"
                : fallback;

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
                      {user.pseudo?.charAt(0)?.toUpperCase() +
                        user.pseudo?.slice(1)?.toLowerCase()}
                    </h2>

                    <p className="profil-card-details">
                      {user.age} ans - {user.localisation}
                    </p>

                    <p className="profil-card-details-type">{user.type}</p>

                    {user.distance && (
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
