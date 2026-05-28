import Link from "next/link";
import { prisma } from "../../lib/prisma";
import DeleteArticleButton from "../../components/DeleteArticleButton/DeleteArticleButton";
import "./blog.css";
import { getUserFromToken } from "../../lib/auth";

const secret = process.env.JWT_SECRET;

if (!secret) {
  throw new Error("JWT_SECRET non défini");
}

export default async function BlogPage() {
  const user = await getUserFromToken();
  const isAdmin = user?.role === "ADMIN";

  const articles = await prisma.article.findMany({
    orderBy: {
      createdAt: "desc",
    },

    select: {
      id: true,
      slug: true,
      titre: true,
      description: true,
      createdAt: true,

      images: {
        take: 1,

        select: {
          url: true,
        },
      },
    },
  });

  return (
    <div className="blog-container">
      <h1 className="blog-title">Les articles du blog</h1>

      {isAdmin && (
        <Link href="/admin/blog" className="blog-admin-button">
          ✏️ Créer un article
        </Link>
      )}

      {articles.length === 0 ? (
        <p>Aucun article pour le moment.</p>
      ) : (
        <ul className="blog-list">
          {articles.map((article) => (
            <li key={article.id} className="blog-article">
              <Link
                href={`/blog/${article.slug}`}
                className="blog-article-link"
              >
                {article.images?.[0]?.url && (
                  <img
                    src={article.images[0].url}
                    alt={article.titre}
                    className="blog-article-image"
                  />
                )}

                <div className="blog-article-content">
                  <h2>{article.titre}</h2>

                  <p>{article.description}</p>

                  <small>
                    Publié le{" "}
                    {new Date(article.createdAt).toLocaleDateString("fr-FR")}
                  </small>
                </div>
              </Link>

              {isAdmin && (
                <div className="admin-actions">
                  <Link href={`/admin/blog/editer/${article.id}`}>
                    ✏️ Modifier
                  </Link>

                  <DeleteArticleButton articleId={article.id} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}