'use client';

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import "./edit.css";

export default function EditArticlePage() {
  const params = useParams();           // doit être { id: "..." }
  const router = useRouter();

  // sécurise id quel que soit le type retourné
  const id = useMemo(() => {
    const raw = params?.id;
    return Array.isArray(raw) ? raw[0] : raw;
  }, [params]);

  const [loading, setLoading] = useState(true);
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [contenu, setContenu] = useState("");
  const [images, setImages] = useState([]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await fetch(`/api/articles/${id}`, { cache: "no-store" });
        if (!res.ok) {
          console.warn("[EditArticle] GET /api/articles/", id, "-> status", res.status);
          router.push("/admin/blog?e=notfound");
          return;
        }
        const article = await res.json();
        setTitre(article.titre ?? "");
        setDescription(article.description ?? "");
        setContenu(article.contenu ?? "");
        setImages(
          Array.isArray(article.images)
            ? article.images.map((img) => (typeof img === "string" ? img : img?.url)).filter(Boolean)
            : []
        );
      } catch (err) {
        console.error("[EditArticle] fetch error:", err);
        router.push("/admin/blog?e=error");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, router]);

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    const uploaded = [];
    for (const file of files) {
      const formData = new FormData();
      formData.append("image", file);
      try {
        const res = await fetch("/api/upload-article-image", { method: "POST", body: formData });
        if (!res.ok) {
          console.warn("[EditArticle] upload status", res.status);
          continue;
        }
        const data = await res.json(); // { path: "articles/uuid.jpg" }
        if (data?.path) uploaded.push(data.path);
      } catch (e2) {
        console.error("[EditArticle] upload error:", e2);
      }
    }
    if (uploaded.length) setImages((prev) => [...prev, ...uploaded]);
  };

  const handleRemoveImage = async (key) => {
    if (!confirm("Supprimer cette image ?")) return;
    try {
      const res = await fetch("/api/delete-article-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      if (res.ok) setImages((prev) => prev.filter((k) => k !== key));
      else console.warn("[EditArticle] delete image status", res.status);
    } catch (e) {
      console.error("[EditArticle] delete image error:", e);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/articles/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titre, description, contenu, images }),
      });
      if (res.ok) router.push("/admin/blog?u=ok");
      else {
        console.warn("[EditArticle] PUT status", res.status);
        alert("Erreur lors de la mise à jour.");
      }
    } catch (e) {
      console.error("[EditArticle] PUT error:", e);
      alert("Erreur lors de la mise à jour.");
    }
  };

  function ArticlePresignedImg({ s3Key, ...props }) {
    const [url, setUrl] = useState(null);
    useEffect(() => {
      if (!s3Key) return setUrl("/default.jpg");
      if (String(s3Key).startsWith("http")) return setUrl(s3Key);
      fetch("/api/photos/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: s3Key }),
      })
        .then((r) => r.json())
        .then((d) => setUrl(d?.url || "/default.jpg"))
        .catch(() => setUrl("/default.jpg"));
    }, [s3Key]);
    return (
      <img
        src={url || "/default.jpg"}
        alt={props.alt || "aperçu"}
        className="preview-image"
        style={{ maxWidth: 200, maxHeight: 150, borderRadius: 8, objectFit: "cover", ...props.style }}
        width={200}
        height={150}
      />
    );
  }

  if (!id) return <div className="edit-container">Paramètre d’URL manquant (id).</div>;
  if (loading) return <div className="edit-container">Chargement…</div>;

  return (
    <div className="edit-container">
      <h1>Éditer l&apos;article</h1>
      <form className="edit-form" onSubmit={handleSubmit}>
        <input type="text" value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Titre" required />
        <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brève description" />
        <textarea value={contenu} onChange={(e) => setContenu(e.target.value)} placeholder="Contenu (HTML autorisé)" required />
        <input type="file" accept="image/*" multiple onChange={handleImageUpload} />

        <div className="image-preview">
          {images.map((key, index) => (
            <div key={`${key}-${index}`} className="image-wrapper">
              <ArticlePresignedImg s3Key={key} alt={`Image ${index}`} />
              <button type="button" className="remove-image-btn" onClick={() => handleRemoveImage(key)}>❌</button>
            </div>
          ))}
        </div>

        <button type="submit">Enregistrer</button>
      </form>
    </div>
  );
}
