"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import "./partenaires.css";

// Mini composant pour gérer la presigned URL S3 privée ou publique
function PresignedImage({ s3Key, alt, ...props }) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    if (!s3Key) return setUrl("/default.jpg");
    if (s3Key.startsWith("http")) return setUrl(s3Key);
    fetch("/api/photos/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: s3Key }),
    })
      .then(res => res.json())
      .then(data => setUrl(data.url || "/default.jpg"))
      .catch(() => setUrl("/default.jpg"));
  }, [s3Key]);

  if (!url)
    return (
      <div
        style={{
          width: 40,
          height: 40,
          background: "#eee",
          borderRadius: 8,
          marginRight: 8,
          display: "inline-block",
          verticalAlign: "middle"
        }}
      />
    );

  return (
    <img
      src={url}
      alt={alt}
      style={{
        width: 40,
        height: 40,
        objectFit: "cover",
        borderRadius: 8,
        marginRight: 8,
        verticalAlign: "middle",
        ...props.style
      }}
      {...props}
    />
  );
}

export default function AdminPartenaires() {
  const [user, setUser] = useState(null);
  const [partenaires, setPartenaires] = useState([]);
  const [form, setForm] = useState({ nom: "", type: "", lien: "", photo: null, photoUrl: "" });
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

    const formData = new FormData();
    if (form.id) formData.append("id", form.id);
    formData.append("nom", form.nom);
    formData.append("type", form.type);
    formData.append("lien", form.lien);
    if (form.photo) formData.append("photo", form.photo);

    const res = await fetch("/api/admin/partenaires", {
      method,
      body: formData,
    });

    if (res.ok) {
      setForm({ nom: "", type: "", lien: "", photo: null, photoUrl: "" });
      fetchPartenaires();
    }
  };

  const handleEdit = (p) => {
    setForm({
      id: p.id,
      nom: p.nom,
      type: p.type,
      lien: p.lien,
      photo: null,
      photoUrl: p.photoUrl || "",
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
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setForm({ ...form, photo: e.target.files[0] })}
        />

        <button type="submit">{form.id ? "Mettre à jour" : "Ajouter"}</button>
        {form.id && (
          <button
            type="button"
            onClick={() => setForm({ nom: "", type: "", lien: "", photo: null, photoUrl: "" })}
          >
            Annuler
          </button>
        )}
      </form>

      <ul className="liste-partenaires">
        {partenaires.map((p) => (
          <li key={p.id}>
            {p.photoUrl && (
              <PresignedImage s3Key={p.photoUrl} alt={p.nom} />
            )}
            <strong>{p.nom}</strong> — {p.type} —{" "}
            <a href={p.lien} target="_blank" rel="noreferrer">
              site
            </a>{" "}
            <button onClick={() => handleEdit(p)}>✏️</button>
            <button onClick={() => handleDelete(p.id)}>❌</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
