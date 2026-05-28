"use client";

import { useState, useEffect } from "react";

export default function ArticleImagesWithPresign({
  images = [],
  variant = "article",
  alt = "Illustration",
}) {
  const [urls, setUrls] = useState([]);

  useEffect(() => {
    let isMounted = true;

    if (!images || images.length === 0) {
      setUrls([]);
      return;
    }

    Promise.all(
      images.map((img) =>
        fetch("/api/photos/presign", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            key: img.url,
          }),
        })
          .then((res) => res.json())
          .then((data) => data.url || "/default.jpg")
          .catch(() => "/default.jpg")
      )
    ).then((result) => {
      if (isMounted) {
        setUrls(result);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [images]);

  if (urls.length === 0) {
    return null;
  }

  return (
    <div
      className={
        variant === "blog"
          ? "blog-article-image-wrapper"
          : "article-images"
      }
    >
      {urls.map((url, index) => (
        <img
          key={index}
          src={url}
          alt={`${alt} ${index + 1}`}
          className={
            variant === "blog"
              ? "blog-article-image"
              : "article-image"
          }
        />
      ))}
    </div>
  );
}