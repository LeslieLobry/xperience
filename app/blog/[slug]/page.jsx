
import { prisma } from "../../../lib/prisma";
import { getUserFromToken } from "../../../lib/auth";
import { notFound, redirect } from "next/navigation";
import "./article.css";
import Link from "next/link";
import ArticleWrapper from "./ArticleWrapper";
import ArticleImagesWithPresign from "./ArticleImagesWithPresign";

export default async function ArticlePage({ params }) {
  // ✅ Ajout d'une sécurité avec optional chaining
  const slug = params?.slug;

  if (!slug) return notFound();

  const user = await getUserFromToken();
  if (!user) return redirect("/connexion");

  const article = await prisma.article.findUnique({
    where: { slug },
    include: {
      auteur: true,
      images: true,
    },
  });

  if (!article) return notFound();

  return (
    <div className="article-container">
      {/* Composant client pour compter la vue */}
      <ArticleWrapper articleId={article.id} />

      <h2 className="article-title">{article.titre}</h2>
      <p className="article-meta">
        {new Date(article.createdAt).toLocaleDateString("fr-FR")}{" "}
        {article.vues} vues
      </p>

      {article.description && (
        <p className="article-description">{article.description}</p>
      )}

      {article.images?.length > 0 && (
        <ArticleImagesWithPresign images={article.images} />
      )}

      <div
        className="article-content"
        dangerouslySetInnerHTML={{ __html: article.contenu }}
      />

      <Link href="/blog" className="back-to-blog-button">
        ← Retour au blog
      </Link>
    </div>
  );
}
