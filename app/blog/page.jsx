import { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { redirect } from "next/navigation";
import Link from "next/link";
import "./blog.css";

const prisma = new PrismaClient();
const secret = process.env.JWT_SECRET;
if (!secret) throw new Error("JWT_SECRET non défini");

export default async function BlogPage({ searchParams }) {
  const page = Number.isInteger(Number(searchParams?.page))
    ? parseInt(searchParams.page)
    : 1;
  const perPage = 5;
  const skip = (page - 1) * perPage;

  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) return redirect("/connexion");

  let decoded;
  try {
    decoded = jwt.verify(token, secret);
  } catch {
    return redirect("/connexion");
  }

  const user = await prisma.utilisateur.findUnique({
    where: { id: decoded.id },
  });

  const [articles, totalArticles] = await Promise.all([
    prisma.article.findMany({
      skip,
      take: perPage,
      orderBy: { createdAt: "desc" },
      include: { images: true },
    }),
    prisma.article.count(),
  ]);

  const totalPages = Math.ceil(totalArticles / perPage);

  return (
    <div className="blog-container">
      <h1 className="blog-title">Blog</h1>

      {user?.role === "ADMIN" && (
        <div className="blog-admin-link">
          <Link href="/admin/blog" className="blog-admin-button">
            Éditer les articles
          </Link>
        </div>
      )}

      {articles.map((article) => {
        const image = article.images?.[0];

        return (
          <Link
            key={article.id}
            href={`/blog/${article.slug}`}
            className="blog-article-link"
          >
            <div className="blog-article">
              <h2 className="blog-link">{article.titre}</h2>
              <p className="blog-date">
                Publié le {new Date(article.createdAt).toLocaleDateString("fr-FR")}
              </p>
              {image && (
                <img
                  src={image.url}
                  alt={article.titre}
                  className="blog-thumbnail"
                  style={{ maxWidth: "200px", marginBottom: "10px" }}
                />
              )}
            </div>
          </Link>
        );
      })}

      {totalPages > 1 && (
        <div className="pagination">
          {Array.from({ length: totalPages }, (_, i) => (
            <Link
              key={i}
              href={`/blog?page=${i + 1}`}
              className={`pagination-link ${page === i + 1 ? "active" : ""}`}
            >
              {i + 1}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
