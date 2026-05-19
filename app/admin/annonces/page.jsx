// app/admin/annonces/page.jsx
"use client";

import { useEffect, useState } from "react";
import "./admin-annonces.css";

export default function AdminAnnoncesPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);

  const [draft, setDraft] = useState({
    titre: "",
    message: "",
    actif: true,
    expireAt: "",
    durationMs: null,
    textColor: "",
    bgColor: "",
    overlayColor: "",
    fontSizePx: null,
    borderRadiusPx: null,
    maxWidthPx: null,
  });

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/annonces", { cache: "no-store" });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Erreur");
      setList(json.data || []);
    } catch (e) {
      console.error(e);
      alert("Impossible de charger les annonces");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  function startCreate() {
    setEditingId("NEW");
    setDraft({
      titre: "",
      message: "",
      actif: true,
      expireAt: "",
      durationMs: null,
      textColor: "",
      bgColor: "",
      overlayColor: "",
      fontSizePx: null,
      borderRadiusPx: null,
      maxWidthPx: null,
    });
  }

  function startEdit(id) {
    const a = list.find((x) => x.id === id);
    if (!a) return;

    const expireStr = a.expireAt
      ? new Date(a.expireAt).toISOString().slice(0, 10)
      : "";

    setEditingId(id);
    setDraft({
      titre: a.titre || "",
      message: a.message || "",
      actif: !!a.actif,
      expireAt: expireStr,
      durationMs: a.durationMs ?? null,
      textColor: a.textColor ?? "",
      bgColor: a.bgColor ?? "",
      overlayColor: a.overlayColor ?? "",
      fontSizePx: a.fontSizePx ?? null,
      borderRadiusPx: a.borderRadiusPx ?? null,
      maxWidthPx: a.maxWidthPx ?? null,
    });
  }

  async function submitForm(e) {
    e.preventDefault();

    const payload = {
      titre: draft.titre.trim(),
      message: draft.message.trim(),
      actif: !!draft.actif,
      expireAt: draft.expireAt ? `${draft.expireAt}T23:59:59` : null,

      durationMs: draft.durationMs ?? null,
      textColor: draft.textColor ? draft.textColor : null,
      bgColor: draft.bgColor ? draft.bgColor : null,
      overlayColor: draft.overlayColor ? draft.overlayColor : null,
      fontSizePx: draft.fontSizePx ?? null,
      borderRadiusPx: draft.borderRadiusPx ?? null,
      maxWidthPx: draft.maxWidthPx ?? null,
    };

    if (!payload.titre || !payload.message) {
      alert("Titre et message requis");
      return;
    }

    try {
      const url =
        editingId === "NEW" ? "/api/annonces" : `/api/annonces/${editingId}`;
      const method = editingId === "NEW" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Erreur");

      setEditingId(null);
      await refresh();
    } catch (e) {
      console.error(e);
      alert("Erreur lors de l’enregistrement");
    }
  }

  async function toggleActif(a) {
    try {
      const res = await fetch(`/api/annonces/${a.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ actif: !a.actif }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Erreur");
      await refresh();
    } catch (e) {
      console.error(e);
      alert("Erreur lors du changement d’état");
    }
  }

  async function removeOne(id) {
    if (!confirm("Supprimer cette annonce ?")) return;
    try {
      const res = await fetch(`/api/annonces/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Erreur");
      await refresh();
    } catch (e) {
      console.error(e);
      alert("Erreur lors de la suppression");
    }
  }

  return (
    <div className="admin-annonces">
      <div className="admin-annonces__header">
        <h1>📢 Gérer les annonces</h1>
        {!editingId && (
          <button className="btn btn-primary" onClick={startCreate}>
            ➕ Nouvelle annonce
          </button>
        )}
      </div>

      {editingId && (
        <form className="annonce-form" onSubmit={submitForm}>
          <div className="form-row">
            <label htmlFor="titre">Titre</label>
            <input
              id="titre"
              type="text"
              value={draft.titre}
              onChange={(e) => setDraft({ ...draft, titre: e.target.value })}
            />
          </div>

          <div className="form-row">
            <label htmlFor="message">Message</label>
            <textarea
              id="message"
              rows={3}
              value={draft.message}
              onChange={(e) =>
                setDraft({ ...draft, message: e.target.value })
              }
            />
          </div>

          <div className="form-row form-row--inline">
            <label className="checkbox">
              <input
                type="checkbox"
                checked={draft.actif}
                onChange={(e) =>
                  setDraft({ ...draft, actif: e.target.checked })
                }
              />
              Actif
            </label>

            <div className="expire-field">
              <label htmlFor="expireAt">Expire le (optionnel)</label>
              <input
                id="expireAt"
                type="date"
                value={draft.expireAt}
                onChange={(e) =>
                  setDraft({ ...draft, expireAt: e.target.value })
                }
              />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-row">
              <label>Durée (ms)</label>
              <input
                type="number"
                min="1000"
                step="500"
                value={draft.durationMs ?? ""}
                placeholder="ex: 6000"
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    durationMs: e.target.value
                      ? parseInt(e.target.value, 10)
                      : null,
                  })
                }
              />
            </div>

            <div className="form-row">
              <label>Couleur texte</label>
              <input
                type="text"
                placeholder="#e0c084"
                value={draft.textColor ?? ""}
                onChange={(e) =>
                  setDraft({ ...draft, textColor: e.target.value || "" })
                }
              />
            </div>

            <div className="form-row">
              <label>Couleur fond (carte)</label>
              <input
                type="text"
                placeholder="white"
                value={draft.bgColor ?? ""}
                onChange={(e) =>
                  setDraft({ ...draft, bgColor: e.target.value || "" })
                }
              />
            </div>

            <div className="form-row">
              <label>Couleur overlay</label>
              <input
                type="text"
                placeholder="rgba(0,0,0,.6)"
                value={draft.overlayColor ?? ""}
                onChange={(e) =>
                  setDraft({ ...draft, overlayColor: e.target.value || "" })
                }
              />
            </div>

            <div className="form-row">
              <label>Taille police (px)</label>
              <input
                type="number"
                min="12"
                max="72"
                step="1"
                value={draft.fontSizePx ?? ""}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    fontSizePx: e.target.value
                      ? parseInt(e.target.value, 10)
                      : null,
                  })
                }
              />
            </div>

            <div className="form-row">
              <label>Rayon des coins (px)</label>
              <input
                type="number"
                min="0"
                max="48"
                step="1"
                value={draft.borderRadiusPx ?? ""}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    borderRadiusPx: e.target.value
                      ? parseInt(e.target.value, 10)
                      : null,
                  })
                }
              />
            </div>

            <div className="form-row">
              <label>Largeur max (px)</label>
              <input
                type="number"
                min="240"
                max="900"
                step="10"
                value={draft.maxWidthPx ?? ""}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    maxWidthPx: e.target.value
                      ? parseInt(e.target.value, 10)
                      : null,
                  })
                }
              />
            </div>
          </div>

          <div className="preview">
            <div
              className="loader-annonce is-preview"
              style={{
                backgroundColor: draft.overlayColor || "rgba(0,0,0,.6)",
              }}
            >
              <div
                className="loader-contenu"
                style={{
                  background: draft.bgColor || "white",
                  borderRadius: (draft.borderRadiusPx ?? 16) + "px",
                  maxWidth: (draft.maxWidthPx ?? 520) + "px",
                }}
              >
                <p
                  className="fade-in"
                  style={{
                    color: draft.textColor || "#e0c084",
                    fontSize: (draft.fontSizePx ?? 36) + "px",
                    textAlign: "center",
                    whiteSpace: "pre-line",
                  }}
                >
                  <strong>{draft.titre || "Titre d’exemple"}</strong>
                  <br />
                  {draft.message || "Message d’annonce d’exemple"}
                </p>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button className="btn btn-primary" type="submit">
              💾 Enregistrer
            </button>
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => setEditingId(null)}
            >
              Annuler
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="muted">Chargement…</p>
      ) : (
        <div className="annonces-list">
          {list.length === 0 && <p className="muted">Aucune annonce</p>}

          {list.map((a) => (
            <div key={a.id} className="annonce-card">
              <div className="annonce-card__head">
                <strong className="annonce-card__title">{a.titre}</strong>

                <div className="annonce-card__actions">
                  <button
                    className="btn btn-secondary"
                    onClick={() => startEdit(a.id)}
                  >
                    ✏️ Modifier
                  </button>

                  <button
                    className="btn btn-secondary"
                    onClick={() => toggleActif(a)}
                  >
                    {a.actif ? "Désactiver" : "Activer"}
                  </button>

                  <button
                    className="btn btn-danger"
                    onClick={() => removeOne(a.id)}
                  >
                    Supprimer
                  </button>
                </div>
              </div>

              <div
                className="annonce-card__message"
                style={{ whiteSpace: "pre-line" }}
              >
                {a.message}
              </div>

              <div className="annonce-card__meta">
                {a.expireAt
                  ? `Expire le ${new Date(a.expireAt).toLocaleDateString()}`
                  : "Sans expiration"}

                <span className={`badge ${a.actif ? "badge--on" : "badge--off"}`}>
                  {a.actif ? "Actif" : "Inactif"}
                </span>
              </div>

              {/* Debug léger */}
              {/* <div className="muted">fontSizePx: {String(a.fontSizePx ?? "null")}</div> */}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}