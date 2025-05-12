import { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { notFound, redirect } from "next/navigation";
import "./article.css";

const prisma = new PrismaClient();
const secret = process.env.JWT_SECRET;
if (!secret) throw new Error("JWT_SECRET non défini");

export default async function ArticlePage({ params }) {
  // ✅ cookies() doit être awaited
  console.log("🔍 SLUG reçu :", params.slug);
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) return redirect("/connexion");

  let decoded;
  try {
    decoded = jwt.verify(token, secret);
  } catch {
    return redirect("/connexion");
  }

  // ✅ params.slug est maintenant autorisé ici
  const article = await prisma.article.findUnique({
    where: { slug: params.slug },
    include: { auteur: true },
  });

  if (!article) return notFound();

  return (
    <div className="article-container">
      <h1 className="article-title">{article.titre}</h1>
      <p className="article-meta">
        Par {article.auteur.pseudo} – {new Date(article.createdAt).toLocaleDateString()}
      </p>
      <div
        className="article-content"
        dangerouslySetInnerHTML={{ __html: article.contenu }}
      />
    </div>
  );
}
