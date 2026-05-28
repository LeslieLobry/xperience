"use client";

import { useState, useEffect } from "react";

export default function ArticleImagesWithPresign({ images }) {
  const [urls, setUrls] = useState([]);

  useEffect(() => {
    let isMounted = true;
    Promise.all(
      images.map((img) =>
        fetch("/api/photos/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: img.url }),
        })
          .then(res => res.json())
          .then(data => data.url || "/default.jpg")
          .catch(() => "/default.jpg")
      )
    ).then((result) => {
      if (isMounted) setUrls(result);
    });
    return () => {
      isMounted = false;
    };
  }, [images]);

  return (
    <div className="article-images">
      {urls.map((url, index) => (
        <img
          key={index}
          src={url}
          alt={`Illustration ${index + 1}`}
          className="article-image"
          // style={{
          //   maxWidth: "100%",
          //   margin: "10px 0",
          //   borderRadius: "10px",
          //   objectFit: "cover",
          //   width: "350px",
          //   height: "350px"
          // }}
          // width={350}
          // height={350}
          
        />
      ))}
    </div>
  );
}
