import { useEffect, useState } from "react";

// petit cache en mémoire pour ne pas re-presigner la même clé 50 fois
const singlePhotoCache = new Map();

export function usePresignedPhoto(photoKey) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    if (!photoKey) {
      setUrl(null);
      return;
    }

    // URL déjà complète (CDN, http…)
    if (photoKey.startsWith("http://") || photoKey.startsWith("https://")) {
      setUrl(photoKey);
      return;
    }

    // si on l’a déjà présignée dans ce rendu → on réutilise
    if (singlePhotoCache.has(photoKey)) {
      setUrl(singlePhotoCache.get(photoKey));
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/photos/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: photoKey }),
        });

        if (!res.ok) throw new Error("presign failed");

        const data = await res.json();
        const finalUrl = data.url || "/default.jpg";

        singlePhotoCache.set(photoKey, finalUrl);

        if (!cancelled) {
          setUrl(finalUrl);
        }
      } catch (e) {
        console.error("❌ usePresignedPhoto erreur:", e);
        if (!cancelled) setUrl("/default.jpg");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [photoKey]);

  return url;
}
