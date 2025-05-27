"use client";

export default function DeleteArticleButton({ articleId }) {
  const handleDelete = async () => {
    const confirmDelete = confirm("Supprimer cet article ?");
    if (!confirmDelete) return;

    try {
      const res = await fetch(`/api/articles/${articleId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        window.location.reload();
      } else {
        alert("Erreur lors de la suppression");
      }
    } catch (err) {
      alert("Erreur réseau");
    }
  };

  return (
    <button onClick={handleDelete} className="delete-btn">
      🗑️ Supprimer
    </button>
  );
}
