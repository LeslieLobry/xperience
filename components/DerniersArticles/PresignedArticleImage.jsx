"use client";
import { useEffect, useState } from "react";

export default function PresignedArticleImage({ s3Key, alt, ...props }) {
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
      <div className="dernier-article-noimage">Chargement…</div>
    );

  // Remplace <Image /> par <img />
  return (
    <img
      src={url}
      alt={alt}
      className="dernier-article-image"
      style={{
        objectFit: "cover",
        width: props.width || "100%",
        height: props.height || "100%",
        ...props.style
      }}
      {...props}
    />
  );
}
