"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import "./DerniersArticles.css";

export default function DerniersArticles() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const res = await fetch("/api/articles/dernieres");
        const data = await res.json();
        setArticles(data.articles || []);
      } catch (err) {
        setArticles([]);
      } finally {
        setLoading(false);
      }
    };
    fetchArticles();
  }, []);

  if (loading) return <p className="articles-loading">Chargement des articles...</p>;
  if (!articles.length) return <p className="articles-empty">Aucun article trouvé.</p>;

  return (
    <section className="dernier-articles-section">
      <h2 className="dernier-articles-title">Derniers articles</h2>
      <div className="dernier-articles-list">
        {articles.map((article) => (
          <Link
            href={`/blog/${article.slug || article.id}`}
            key={article.id}
            className="dernier-article-link"
          >
            <div className="dernier-article-card">
              <div className="dernier-article-image-wrapper">
                {article.images && article.images[0]?.url ? (
                  <Image
                    src={article.images[0].url}
                    alt={article.titre}
                    fill
                    className="dernier-article-image"
                  />
                ) : (
                  <div className="dernier-article-noimage">
                    Pas d'image
                  </div>
                )}
              </div>
              <h3 className="dernier-article-titre">{article.titre}</h3>
              <small className="dernier-article-date">
                {new Date(article.createdAt).toLocaleDateString()}
              </small>
            </div>
          </Link>
        ))}
      </div>
      <Link href="/blog" className="afficher-plus-articles">
  Afficher plus
</Link>

    </section>
  );
}
