import { useEffect, useState } from "react";

function usePresignedPhoto(photoKey) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    if (!photoKey) return setUrl(null);
    if (photoKey.startsWith("http")) {
      setUrl(photoKey); // fallback si tu as des anciennes urls
      return;
    }
    fetch("/api/photos/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: photoKey }),
    })
      .then(res => res.json())
      .then(data => setUrl(data.url))
      .catch(() => setUrl("/default.jpg"));
  }, [photoKey]);

  return url;
}
