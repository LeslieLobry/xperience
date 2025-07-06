// components/DerniersArticles/DerniersArticles.jsx
import Link from "next/link";
import Image from "next/image";
import "./DerniersArticles.css";

export default function DerniersArticles({ articles }) {
  if (!articles?.length) return <p className="articles-empty">Aucun article trouvé.</p>;

  return (
    <section className="dernier-articles-section">
      <h2 className="dernier-articles-title">Derniers articles</h2>
      <div className="dernier-articles-list">
        {articles.map((article) => (
          <Link
            key={article.id}
            href={`/blog/${article.slug || article.id}`}
            className="dernier-article-link"
          >
            <div className="dernier-article-card">
              <div className="dernier-article-image-wrapper">
                {article.images?.[0]?.url ? (
                  <Image
                    src={article.images[0].url}
                    alt={article.titre}
                    fill
                    className="dernier-article-image"
                  />
                ) : (
                  <div className="dernier-article-noimage">Pas d'image</div>
                )}
              </div>
              <h3 className="dernier-article-titre">{article.titre}</h3>
              <small className="dernier-article-date">
                {new Date(article.createdAt).toLocaleDateString("fr-FR")}
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
