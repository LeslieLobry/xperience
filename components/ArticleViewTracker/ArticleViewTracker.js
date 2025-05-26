"use client";
import { useEffect } from "react";

export default function ArticleViewTracker({ articleId }) {
  useEffect(() => {
    const storageKey = `viewed-article-${articleId}`;
    const lastViewed = localStorage.getItem(storageKey);

    const now = Date.now();
    const twoHours = 2 * 60 * 60 * 1000;

    if (!lastViewed || now - parseInt(lastViewed, 10) > twoHours) {
      fetch(`/api/articles/${articleId}/views`, {
        method: "POST",
      }).then(() => {
        localStorage.setItem(storageKey, now.toString());
      }).catch((err) => {
        console.error("Erreur mise à jour vue :", err);
      });
    }
  }, [articleId]);

  return null;
}
