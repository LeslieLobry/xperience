import Link from "next/link";
import { prisma } from "../../lib/prisma";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import DeleteArticleButton from "../../components/DeleteArticleButton/DeleteArticleButton";
import "./blog.css";
import { redirect } from "next/navigation";


const secret = process.env.JWT_SECRET;
if (!secret) throw new Error("JWT_SECRET non défini");

export default async function BlogPage() {
  // 🔐 Vérifier l'utilisateur connecté
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  let user = null;

  if (token) {
    try {
      user = jwt.verify(token, secret);
    } catch {
      // token invalide
    }
  }if (!user) {
    // Si pas connecté, redirection vers la page de connexion
    redirect("/connexion");
  }


  const isAdmin = user?.role === "ADMIN";

  // 📄 Récupérer les articles
  const articles = await prisma.article.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      slug: true,
      titre: true,
      description: true,
      createdAt: true,
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
                <h2>{article.titre}</h2>
                <p>{article.description}</p>
                <small>
                  Publié le{" "}
                  {new Date(article.createdAt).toLocaleDateString("fr-FR")}
                </small>
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
