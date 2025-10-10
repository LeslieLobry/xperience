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
        <form onSubmit={submitForm} style={{ marginBottom: 16, border: "1px solid #ddd", padding: 12, borderRadius: 8 }}>
          <div style={{ marginBottom: 8 }}>
            <label>Titre</label>
            <input
              type="text"
              value={draft.titre}
              onChange={(e) => setDraft({ ...draft, titre: e.target.value })}
              style={{ width: "100%" }}
            />
          </div>
          <div style={{ marginBottom: 8 }}>
            <label>Message</label>
            <textarea
              value={draft.message}
              onChange={(e) => setDraft({ ...draft, message: e.target.value })}
              rows={3}
              style={{ width: "100%" }}
            />
          </div>
          <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 8 }}>
            <label>
              <input
                type="checkbox"
                checked={draft.actif}
                onChange={(e) => setDraft({ ...draft, actif: e.target.checked })}
              />{" "}
              Actif
            </label>

            <div>
              <label>Expire le (optionnel)</label>
              <input
                type="date"
                value={draft.expireAt}
                onChange={(e) => setDraft({ ...draft, expireAt: e.target.value })}
              />
            </div>
          </div>

          <div>
            <button type="submit">💾 Enregistrer</button>
            <button type="button" onClick={() => setEditingId(null)} style={{ marginLeft: 8 }}>
              Annuler
            </button>
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
