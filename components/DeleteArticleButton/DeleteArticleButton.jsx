"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeleteArticleButton({ articleId }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    const confirmDelete = confirm("Supprimer cet article ?");
    if (!confirmDelete) return;

    try {
      setLoading(true);

      const res = await fetch(`/api/articles/${articleId}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      let data = null;
      try {
        data = await res.json();
      } catch {}

      if (res.ok) {
        // ✅ mieux que window.location.reload() en App Router
        router.refresh();
        // fallback si besoin
        // window.location.reload();
      } else {
        alert(data?.error || "Erreur lors de la suppression");
        console.error("DELETE error:", res.status, data);
      }
    } catch (err) {
      console.error(err);
      alert("Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={handleDelete} className="delete-btn" disabled={loading}>
      {loading ? "⏳ Suppression..." : "🗑️ Supprimer"}
    </button>
  );
}
