import { useEffect, useState } from "react";

export function usePresignedProfilePhotos(profils) {
  const [urlsById, setUrlsById] = useState({});

  useEffect(() => {
    if (!Array.isArray(profils) || profils.length === 0) {
      setUrlsById({});
      return;
    }

    const keys = profils
      .map((p) => p.photoUrl)
      .filter(Boolean);

    if (keys.length === 0) {
      setUrlsById({});
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/photos/presign-batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keys }),
        });

        const data = await res.json();
        if (!data?.urls) return;

        if (!cancelled) {
          const map = {};
          profils.forEach((p) => {
            const key = p.photoUrl;
            if (!key) {
              map[p.id] = "/default.jpg";
            } else if (key.startsWith("http")) {
              map[p.id] = key;
            } else {
              map[p.id] = data.urls[key] || "/default.jpg";
            }
          });

          setUrlsById(map);
        }
      } catch (e) {
        console.error("❌ usePresignedProfilePhotos:", e);
        if (!cancelled) {
          const fallback = {};
          profils.forEach((p) => (fallback[p.id] = "/default.jpg"));
          setUrlsById(fallback);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // dépendances : on se base sur la liste des keys pour éviter des boucles infinies
  }, [Array.isArray(profils) ? profils.map((p) => p.photoUrl).join(",") : ""]);

  return urlsById;
}
