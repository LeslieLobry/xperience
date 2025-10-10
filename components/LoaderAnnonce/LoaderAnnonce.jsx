"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import "./LoaderAnnonce.css";

/** ======= Helpers LocalStorage ======= */
const LS_ANNONCES_KEY = "xp_annonces_v1";
const LS_LAST_SEEN_KEY = "xp_loader_annonce_last_seen";

/** Une “annonce” = { id, titre, message, actif, expireAt? (ISO string) } */
function loadAnnonces() {
  try {
    const raw = localStorage.getItem(LS_ANNONCES_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr;
  } catch {
    return [];
  }
}

function saveAnnonces(list) {
  localStorage.setItem(LS_ANNONCES_KEY, JSON.stringify(list || []));
}

function hasOneDayPassed() {
  const lastSeen = localStorage.getItem(LS_LAST_SEEN_KEY);
  if (!lastSeen) return true;
  const now = Date.now();
  return now - parseInt(lastSeen, 10) > 86400000; // 24h
}

function markSeenNow() {
  localStorage.setItem(LS_LAST_SEEN_KEY, Date.now().toString());
}

function isExpired(expireAt) {
  if (!expireAt) return false;
  const t = Date.parse(expireAt);
  if (Number.isNaN(t)) return false;
  return Date.now() > t;
}

/** ======= Composant ======= */
export default function LoaderAnnonce({ isAdmin = false, autoHideMs = 6000 }) {
  const [annonces, setAnnonces] = useState([]);
  const [visible, setVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({ titre: "", message: "", actif: true, expireAt: "" });
  const contenuRef = useRef(null);

  // Charger les annonces au montage
  useEffect(() => {
    const initial = loadAnnonces();
    setAnnonces(initial);
  }, []);

  // Annonces “publiques” (actives et non expirées)
  const annoncesActives = useMemo(() => {
    return (annonces || []).filter((a) => a.actif && !isExpired(a.expireAt));
  }, [annonces]);

  // Choix de l’annonce à afficher (on prend la première active, ou on peut randomiser)
  const annonceAffichee = useMemo(() => {
    if (!annoncesActives.length) return null;
    // Tri par id ou par création si tu ajoutes createdAt plus tard
    return annoncesActives[0];
  }, [annoncesActives]);

  // Logique d’apparition (publique seulement)
  useEffect(() => {
    if (isAdmin) return; // en mode admin, on n’affiche pas l’overlay auto (on utilise le panneau d’édition)
    if (!annonceAffichee) return;

    if (hasOneDayPassed()) {
      setVisible(true);

      // auto-disparition
      const timer = setTimeout(() => {
        setVisible(false);
        markSeenNow();
      }, autoHideMs);

      // clic dehors => fermeture
      const handleClick = (e) => {
        if (contenuRef.current && !contenuRef.current.contains(e.target)) {
          setVisible(false);
          markSeenNow();
        }
      };
      window.addEventListener("click", handleClick);

      return () => {
        clearTimeout(timer);
        window.removeEventListener("click", handleClick);
      };
    }
  }, [annonceAffichee, isAdmin, autoHideMs]);

  // Actions Admin CRUD
  function resetDraft() {
    setDraft({ titre: "", message: "", actif: true, expireAt: "" });
    setEditingId(null);
  }

  function startCreate() {
    resetDraft();
    setEditingId("NEW");
  }

  function startEdit(id) {
    const a = annonces.find((x) => x.id === id);
    if (!a) return;
    setDraft({
      titre: a.titre || "",
      message: a.message || "",
      actif: !!a.actif,
      expireAt: a.expireAt || "",
    });
    setEditingId(id);
  }

  function deleteOne(id) {
    const next = (annonces || []).filter((x) => x.id !== id);
    setAnnonces(next);
    saveAnnonces(next);
    if (editingId === id) resetDraft();
  }

  function toggleActif(id) {
    const next = (annonces || []).map((x) =>
      x.id === id ? { ...x, actif: !x.actif } : x
    );
    setAnnonces(next);
    saveAnnonces(next);
  }

  function submitForm(e) {
    e?.preventDefault?.();
    const { titre, message, actif, expireAt } = draft;

    // Validation minimale
    if (!titre.trim() || !message.trim()) {
      alert("Titre et message sont requis.");
      return;
    }

    // Normaliser date vide => null
    const exp = expireAt?.trim() ? new Date(expireAt).toISOString() : null;

    if (editingId === "NEW") {
      const newItem = {
        id: crypto.randomUUID(),
        titre: titre.trim(),
        message: message.trim(),
        actif: !!actif,
        expireAt: exp,
      };
      const next = [newItem, ...(annonces || [])];
      setAnnonces(next);
      saveAnnonces(next);
      resetDraft();
    } else if (editingId) {
      const next = (annonces || []).map((x) =>
        x.id === editingId
          ? { ...x, titre: titre.trim(), message: message.trim(), actif: !!actif, expireAt: exp }
          : x
      );
      setAnnonces(next);
      saveAnnonces(next);
      resetDraft();
    }
  }

  // Bouton “Ne plus montrer aujourd’hui”
  function dontShowToday() {
    markSeenNow();
    setVisible(false);
  }

  // ====== Rendu ======

  // 1) Mode PUBLIC : pop-in
  if (!isAdmin && visible && annonceAffichee) {
    return (
      <div className="loader-annonce">
        <div className="loader-contenu" ref={contenuRef}>
          <p className="fade-in">
            <strong>{annonceAffichee.titre}</strong>
            <br />
            {annonceAffichee.message}
            {annonceAffichee?.expireAt && !isExpired(annonceAffichee.expireAt) && (
              <>
                <br />
                <small>
                  Offre valable jusqu’au{" "}
                  <strong>{new Date(annonceAffichee.expireAt).toLocaleDateString()}</strong>
                </small>
              </>
            )}
          </p>

          <div className="loader-actions">
            <button className="btn-secondaire" onClick={dontShowToday}>
              Ne plus montrer aujourd’hui
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2) Mode ADMIN : panneau de gestion
  if (isAdmin) {
    return (
      <div className="annonces-admin-panel">
        <div className="admin-header">
          <h3>Annonces (pop-in)</h3>
          <button className="btn-primaire" onClick={startCreate}>+ Nouvelle annonce</button>
        </div>

        {editingId && (
          <form className="annonce-form" onSubmit={submitForm}>
            <div className="form-row">
              <label>Titre</label>
              <input
                type="text"
                value={draft.titre}
                onChange={(e) => setDraft((d) => ({ ...d, titre: e.target.value }))}
                placeholder="Ex: Accès gratuit"
              />
            </div>

            <div className="form-row">
              <label>Message</label>
              <textarea
                value={draft.message}
                onChange={(e) => setDraft((d) => ({ ...d, message: e.target.value }))}
                placeholder="Ex: Jusqu'au 16/10, le site est totalement gratuit !"
                rows={3}
              />
            </div>

            <div className="form-row-inline">
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={draft.actif}
                  onChange={(e) => setDraft((d) => ({ ...d, actif: e.target.checked }))}
                />
                Actif
              </label>

              <div className="expire-field">
                <label>Expire le (optionnel)</label>
                <input
                  type="date"
                  value={draft.expireAt ? draft.expireAt.slice(0, 10) : ""}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, expireAt: e.target.value ? `${e.target.value}T23:59:59` : "" }))
                  }
                />
              </div>
            </div>

            <div className="form-actions">
              <button className="btn-primaire" type="submit">
                {editingId === "NEW" ? "Créer" : "Enregistrer"}
              </button>
              <button className="btn-secondaire" type="button" onClick={resetDraft}>
                Annuler
              </button>
            </div>
          </form>
        )}

        <div className="annonces-list">
          {(annonces || []).length === 0 && <p>Aucune annonce pour le moment.</p>}
          {(annonces || []).map((a) => {
            const expLabel =
              a.expireAt ? new Date(a.expireAt).toLocaleDateString() : "—";
            return (
              <div className="annonce-item" key={a.id}>
                <div className="annonce-main">
                  <div className="annonce-title">
                    <strong>{a.titre}</strong>{" "}
                    {!a.actif && <span className="badge">Inactif</span>}
                    {isExpired(a.expireAt) && <span className="badge badge-warn">Expiré</span>}
                  </div>
                  <div className="annonce-message">{a.message}</div>
                  <div className="annonce-meta">
                    Expire le : <em>{expLabel}</em>
                  </div>
                </div>

                <div className="annonce-actions">
                  <button className="btn-secondaire" onClick={() => startEdit(a.id)}>Modifier</button>
                  <button className="btn-secondaire" onClick={() => toggleActif(a.id)}>
                    {a.actif ? "Désactiver" : "Activer"}
                  </button>
                  <button className="btn-danger" onClick={() => deleteOne(a.id)}>Supprimer</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Rien en public si pas d’annonce à montrer
  return null;
}
