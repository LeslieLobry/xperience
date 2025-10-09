'use client';

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import "./edit.css";

export default function EditArticlePage() {
  // 🔒 Récupération robuste de l'id (gère string | string[])
  const p = useParams();
  const id = Array.isArray(p?.id) ? p.id[0] : p?.id;

  const router = useRouter();

  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [contenu, setContenu] = useState("");
  const [images, setImages] = useState([]); // tableau de clés S3
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return; // évite de fetch tant que le param n'est pas prêt
    let cancelled = false;

    async function fetchArticle() {
      try {
        setLoading(true);
        const res = await fetch(`/api/articles/${id}`);
        if (!res.ok) {
          alert("Article introuvable.");
          router.push("/admin/blog");
          return;
        }

        const payload = await res.json();
        if (cancelled) return;

        // compat: la route peut renvoyer l'article direct OU { article }
        const article = payload?.article ?? payload;
        if (!article?.id) {
          throw new Error("Format de réponse inattendu pour l'article");
        }

        setTitre(article.titre ?? "");
        setDescription(article.description || "");
        setContenu(article.contenu ?? "");

        // Harmonise images → tableau de clés S3 (key/url/path) sans URL absolue quand possible
        const keys = Array.isArray(article.images)
          ? article.images
              .map((img) =>
                typeof img === "string"
                  ? img
                  : img?.key || img?.url || img?.path || ""
              )
              .filter(Boolean)
          : [];

        setImages(keys);
      } catch (e) {
        console.error("fetchArticle error:", e);
        alert("Erreur lors du chargement de l'article.");
        router.push("/admin/blog");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchArticle();
    return () => {
      cancelled = true;
    };
  }, [id, router]);

  // ✅ Upload d’images : on ajoute les clés S3 retournées par l’API
  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const uploaded = [];
    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append("image", file);

        const res = await fetch("/api/upload-article-image", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          console.error("upload error:", await res.text());
          alert("Erreur lors du téléchargement d'une image.");
          continue;
        }

        // attendu: { success: true, path: "articles/uuid.jpg" }
        const data = await res.json();
        const key = data?.path || data?.key || data?.url; // compat
        if (key) uploaded.push(key);
      } catch (err) {
        console.error("upload exception:", err);
        alert("Erreur lors du téléchargement d'une image.");
      }
    }

    if (uploaded.length) {
      setImages((prev) => [...prev, ...uploaded]);
    }
  };

  // ✅ Suppression d’image (clé S3)
  const handleRemoveImage = async (key) => {
    const confirmDelete = confirm("Supprimer cette image ?");
    if (!confirmDelete) return;

    try {
      const res = await fetch("/api/delete-article-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });

      if (!res.ok) {
        console.error("delete error:", await res.text());
        alert("Erreur lors de la suppression.");
        return;
      }

      setImages((prev) => prev.filter((img) => img !== key));
    } catch (err) {
      console.error("delete exception:", err);
      alert("Erreur lors de la suppression.");
    }
  };

  // ✅ Envoi PUT : titre, description, contenu, images (clés S3)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!id) {
      alert("Identifiant d'article absent.");
      return;
    }
    if (!titre?.trim() || !contenu?.trim()) {
      alert("Les champs 'Titre' et 'Contenu' sont requis.");
      return;
    }

    try {
      setSaving(true);
      const res = await fetch(`/api/articles/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titre,
          description,
          contenu,
          images, // tableau de clés S3
        }),
      });

      if (!res.ok) {
        console.error("save error:", await res.text());
        alert("Erreur lors de la mise à jour.");
        return;
      }

      router.push("/admin/blog");
    } catch (err) {
      console.error("save exception:", err);
      alert("Erreur lors de la mise à jour.");
    } finally {
      setSaving(false);
    }
  };

  // ✅ Aperçu client-side avec presign
  function ArticlePresignedImg({ s3Key, ...props }) {
    const [url, setUrl] = useState(null);

    useEffect(() => {
      let cancelled = false;

      async function presign() {
        try {
          if (!s3Key) {
            if (!cancelled) setUrl("/default.jpg");
            return;
          }
          if (String(s3Key).startsWith("http")) {
            if (!cancelled) setUrl(s3Key);
            return;
          }
          const res = await fetch("/api/photos/presign", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key: s3Key }),
          });
          const data = await res.json().catch(() => ({}));
          if (!cancelled) setUrl(data?.url || "/default.jpg");
        } catch {
          if (!cancelled) setUrl("/default.jpg");
        }
      }

      presign();
      return () => {
        cancelled = true;
      };
    }, [s3Key]);

    return (
      <img
        src={url || "/default.jpg"}
        alt={props.alt || "aperçu"}
        className="preview-image"
        style={{
          maxWidth: "200px",
          maxHeight: "150px",
          borderRadius: "8px",
          objectFit: "cover",
          ...props.style,
        }}
        width={200}
        height={150}
      />
    );
  }

  if (loading) {
    return (
      <div className="edit-container">
        <h1>Éditer l&apos;article</h1>
        <p>Chargement…</p>
      </div>
    );
  }

  return (
    <div className="edit-container">
      <h1>Éditer l&apos;article</h1>

      <form className="edit-form" onSubmit={handleSubmit}>
        <input
          type="text"
          value={titre}
          onChange={(e) => setTitre(e.target.value)}
          placeholder="Titre"
          required
        />

        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brève description"
        />

        <textarea
          value={contenu}
          onChange={(e) => setContenu(e.target.value)}
          placeholder="Contenu (HTML autorisé)"
          required
        />

        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageUpload}
        />

        <div className="image-preview">
          {images.map((key, index) => (
            <div key={key || index} className="image-wrapper">
              <ArticlePresignedImg s3Key={key} alt={`Image ${index}`} />
              <button
                type="button"
                className="remove-image-btn"
                onClick={() => handleRemoveImage(key)}
                aria-label="Supprimer l'image"
                title="Supprimer l'image"
              >
                ❌
              </button>
            </div>
          ))}
        </div>

        <button type="submit" disabled={saving}>
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
      </form>
    </div>
  );
}
