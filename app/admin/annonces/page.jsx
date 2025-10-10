// app/admin/annonces/page.jsx
"use client";

import { useEffect, useState } from "react";

export default function AdminAnnoncesPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({ titre: "", message: "", actif: true, expireAt: "" });

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/annonces", { cache: "no-store" });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Erreur");
      setList(json.data);
    } catch (e) {
      console.error(e);
      alert("Impossible de charger les annonces");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  function startCreate() {
    setEditingId("NEW");
    setDraft({ titre: "", message: "", actif: true, expireAt: "" });
  }

  function startEdit(id) {
    const a = list.find((x) => x.id === id);
    if (!a) return;
    setEditingId(id);
    setDraft({
      titre: a.titre || "",
      message: a.message || "",
      actif: !!a.actif,
      expireAt: a.expireAt ? a.expireAt.slice(0, 10) : "",
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
  textColor: draft.textColor || null,
  bgColor: draft.bgColor || null,
  overlayColor: draft.overlayColor || null,
  fontSizePx: draft.fontSizePx ?? null,
  borderRadiusPx: draft.borderRadiusPx ?? null,
  maxWidthPx: draft.maxWidthPx ?? null,
};

    if (!payload.titre || !payload.message) {
      alert("Titre et message requis");
      return;
    }

    try {
      if (editingId === "NEW") {
        const res = await fetch("/api/annonces", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.message || "Erreur");
      } else {
        const res = await fetch(`/api/annonces/${editingId}`, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.message || "Erreur");
      }
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
    <div style={{ padding: 16 }}>
      <h1>Admin · Annonces</h1>

      {!editingId && (
        <button onClick={startCreate} style={{ marginBottom: 12 }}>
          ➕ Nouvelle annonce
        </button>
      )}

      {editingId && (
        <form className="annonce-form" onSubmit={submitForm}>
  <div className="form-row">
    <label htmlFor="titre">Titre</label>
    <input id="titre" type="text" value={draft.titre}
      onChange={(e) => setDraft({ ...draft, titre: e.target.value })}/>
  </div>

  <div className="form-row">
    <label htmlFor="message">Message</label>
    <textarea id="message" rows={3} value={draft.message}
      onChange={(e) => setDraft({ ...draft, message: e.target.value })}/>
  </div>

  <div className="form-row form-row--inline">
    <label className="checkbox">
      <input type="checkbox" checked={draft.actif}
        onChange={(e) => setDraft({ ...draft, actif: e.target.checked })}/>
      Actif
    </label>

    <div className="expire-field">
      <label htmlFor="expireAt">Expire le (optionnel)</label>
      <input id="expireAt" type="date" value={draft.expireAt}
        onChange={(e) => setDraft({ ...draft, expireAt: e.target.value })}/>
    </div>
  </div>

  {/* 🎛️ PERSONNALISATION */}
  <div className="form-grid">
    <div className="form-row">
      <label>Durée (ms)</label>
      <input type="number" min="1000" step="500"
        value={draft.durationMs ?? ""}
        placeholder="ex: 6000"
        onChange={(e) => setDraft({ ...draft, durationMs: e.target.value ? parseInt(e.target.value,10) : null })}/>
    </div>

    <div className="form-row">
      <label>Couleur texte</label>
      <input type="text" placeholder="#e0c084"
        value={draft.textColor ?? ""}
        onChange={(e) => setDraft({ ...draft, textColor: e.target.value || null })}/>
    </div>

    <div className="form-row">
      <label>Couleur fond (carte)</label>
      <input type="text" placeholder="white"
        value={draft.bgColor ?? ""}
        onChange={(e) => setDraft({ ...draft, bgColor: e.target.value || null })}/>
    </div>

    <div className="form-row">
      <label>Couleur overlay</label>
      <input type="text" placeholder="rgba(0,0,0,.6)"
        value={draft.overlayColor ?? ""}
        onChange={(e) => setDraft({ ...draft, overlayColor: e.target.value || null })}/>
    </div>

    <div className="form-row">
      <label>Taille police (px)</label>
      <input type="number" min="12" max="72" step="1"
        value={draft.fontSizePx ?? ""}
        onChange={(e) => setDraft({ ...draft, fontSizePx: e.target.value ? parseInt(e.target.value,10) : null })}/>
    </div>

    <div className="form-row">
      <label>Rayon des coins (px)</label>
      <input type="number" min="0" max="48" step="1"
        value={draft.borderRadiusPx ?? ""}
        onChange={(e) => setDraft({ ...draft, borderRadiusPx: e.target.value ? parseInt(e.target.value,10) : null })}/>
    </div>

    <div className="form-row">
      <label>Largeur max (px)</label>
      <input type="number" min="240" max="900" step="10"
        value={draft.maxWidthPx ?? ""}
        onChange={(e) => setDraft({ ...draft, maxWidthPx: e.target.value ? parseInt(e.target.value,10) : null })}/>
    </div>
  </div>

  {/* Aperçu live */}
  <div className="preview">
    <div className="loader-annonce" style={{ backgroundColor: draft.overlayColor || "rgba(0,0,0,.6)" }}>
      <div className="loader-contenu" style={{
        background: draft.bgColor || "white",
        borderRadius: (draft.borderRadiusPx ?? 16) + "px",
        maxWidth: (draft.maxWidthPx ?? 520) + "px"
      }}>
        <p className="fade-in" style={{
          color: draft.textColor || "#e0c084",
          fontSize: (draft.fontSizePx ?? 36) + "px"
        }}>
          <strong>{draft.titre || "Titre d’exemple"}</strong><br/>
          {draft.message || "Message d’annonce d’exemple"}
        </p>
      </div>
    </div>
  </div>

  <div className="form-actions">
    <button className="btn btn-primary" type="submit">💾 Enregistrer</button>
    <button className="btn btn-secondary" type="button" onClick={() => setEditingId(null)}>Annuler</button>
  </div>
</form>

      )}

      {loading ? (
        <p>Chargement…</p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {list.length === 0 && <p>Aucune annonce</p>}
          {list.map((a) => (
            <div key={a.id} style={{ border: "1px solid #eee", padding: 12, borderRadius: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <strong>{a.titre}</strong>
                <div>
                  <button onClick={() => startEdit(a.id)}>✏️ Modifier</button>
                  <button onClick={() => toggleActif(a)} style={{ marginLeft: 8 }}>
                    {a.actif ? "Désactiver" : "Activer"}
                  </button>
                  <button onClick={() => removeOne(a.id)} style={{ marginLeft: 8, color: "red" }}>
                    Supprimer
                  </button>
                </div>
              </div>
              <div style={{ marginTop: 6 }}>{a.message}</div>
              <div style={{ marginTop: 6, fontSize: 12, color: "#666" }}>
                {a.expireAt ? `Expire le ${new Date(a.expireAt).toLocaleDateString()}` : "Sans expiration"} • {a.actif ? "Actif" : "Inactif"}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
