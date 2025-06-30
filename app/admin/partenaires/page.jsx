"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import "./partenaires.css";

export default function AdminPartenaires() {
  const [user, setUser] = useState(null);
  const [partenaires, setPartenaires] = useState([]);
  const [form, setForm] = useState({ nom: "", type: "", lien: "" });
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // ✅ Vérification de l’utilisateur
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/me");
        if (!res.ok) {
          router.push("/connexion");
          return;
        }

        const data = await res.json();
        if (data.user.role !== "ADMIN") {
          router.push("/");
          return;
        }

        setUser(data.user);
        fetchPartenaires();
      } catch (err) {
        console.error("Erreur auth :", err);
        router.push("/connexion");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const fetchPartenaires = async () => {
    const res = await fetch("/api/admin/partenaires");
    const data = await res.json();
    setPartenaires(data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const method = form.id ? "PUT" : "POST";

    const res = await fetch("/api/admin/partenaires", {
      method,
      body: JSON.stringify(form),
      headers: { "Content-Type": "application/json" },
    });

    if (res.ok) {
      setForm({ nom: "", type: "", lien: "" });
      fetchPartenaires();
    }
  };

  const handleEdit = (p) => {
    setForm({
      id: p.id,
      nom: p.nom,
      type: p.type,
      lien: p.lien,
    });
  };

  const handleDelete = async (id) => {
    if (!confirm("Supprimer ce partenaire ?")) return;

    const res = await fetch("/api/admin/partenaires", {
      method: "DELETE",
      body: JSON.stringify({ id }),
      headers: { "Content-Type": "application/json" },
    });

    if (res.ok) {
      fetchPartenaires();
    }
  };

  if (loading) return <p>Chargement...</p>;

  return (
    <div className="admin-partenaires">
      <h1>Gestion des partenaires</h1>

      <form onSubmit={handleSubmit} className="form-partenaire">
        <input
          type="text"
          placeholder="Nom"
          value={form.nom}
          onChange={(e) => setForm({ ...form, nom: e.target.value })}
          required
        />
        <input
          type="text"
          placeholder="Type"
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
          required
        />
        <input
          type="url"
          placeholder="Lien"
          value={form.lien}
          onChange={(e) => setForm({ ...form, lien: e.target.value })}
          required
        />
        <button type="submit">{form.id ? "Mettre à jour" : "Ajouter"}</button>
        {form.id && (
          <button type="button" onClick={() => setForm({ nom: "", type: "", lien: "" })}>
            Annuler
          </button>
        )}
      </form>

      <ul className="liste-partenaires">
        {partenaires.map((p) => (
          <li key={p.id}>
            <strong>{p.nom}</strong> — {p.type} —{" "}
            <a href={p.lien} target="_blank" rel="noreferrer">site</a>{" "}
            <button onClick={() => handleEdit(p)}>✏️</button>
            <button onClick={() => handleDelete(p.id)}>❌</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
