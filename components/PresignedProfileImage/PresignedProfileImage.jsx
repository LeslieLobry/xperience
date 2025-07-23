import { useEffect, useState } from "react";

export default function PresignedProfileImage({ s3Key, alt, ...props }) {
  const [src, setSrc] = useState("/default-profile.jpg");

  useEffect(() => {
    if (!s3Key) return setSrc("/default-profile.jpg");
    if (s3Key.startsWith("http")) return setSrc(s3Key);
    fetch("/api/photos/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: s3Key }),
    })
      .then((r) => r.json())
      .then((data) => setSrc(data.url || "/default-profile.jpg"))
      .catch(() => setSrc("/default-profile.jpg"));
  }, [s3Key]);

  return (
    <img
      src={src}
      alt={alt}
      {...props}
    />
  );
}
