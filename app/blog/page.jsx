import { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { redirect } from "next/navigation";
import Link from "next/link"; // <- à ajouter
import "./blog.css";

const prisma = new PrismaClient();
const secret = process.env.JWT_SECRET;
if (!secret) throw new Error("JWT_SECRET non défini");

export default async function BlogPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) return redirect("/connexion");

  let decoded;
  try {
    decoded = jwt.verify(token, secret);
  } catch {
    return redirect("/connexion");
  }

  // 🧠 Récupération de l'utilisateur avec son rôle
  const user = await prisma.utilisateur.findUnique({
    where: { id: decoded.id },
  });

  const articles = await prisma.article.findMany({
    orderBy: { createdAt: "desc" },
    include: { images: true },
  });

  return (
    <div className="blog-container">
      <h1 className="blog-title">Blog</h1>

      {/* 👇 Lien admin si c’est un ADMIN */}
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
          <div key={article.id} className="blog-article">
            <h2>
              <a href={`/blog/${article.slug}`} className="blog-link">
                {article.titre}
              </a>
            </h2>

            <p suppressHydrationWarning>
              Publié le{" "}
              {typeof window !== "undefined" &&
                new Date(article.createdAt).toLocaleDateString()}
            </p>

            {image && (
              <img
                src={image.url}
                alt={article.titre}
                className="blog-thumbnail"
                style={{ maxWidth: "200px", marginBottom: "10px" }}
              />
            )}

            {article.description && (
              <p className="blog-description">{article.description}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
