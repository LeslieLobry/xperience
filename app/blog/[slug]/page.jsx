import { prisma } from "../../../lib/prisma";
import { getUserFromToken } from "../../../lib/auth";
import { notFound, redirect } from "next/navigation";
import "./article.css";
import Link from "next/link";
import ArticleWrapper from "./ArticleWrapper";

const secret = process.env.JWT_SECRET;
if (!secret) throw new Error("JWT_SECRET non défini");

export default async function ArticlePage({ params }) {
  const slug = params.slug;

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
      <ArticleWrapper articleId={article.id} />
      <h2 className="article-title">{article.titre}</h2>
      <p className="article-meta">
        {new Date(article.createdAt).toLocaleDateString("fr-FR")} –{" "}
        {article.vues} vues
      </p>

      {article.description && (
        <p className="article-description">{article.description}</p>
      )}

      {article.images?.length > 0 && (
        <div className="article-images">
          {article.images.map((image, index) => (
            <img
              key={index}
              src={image.url}
              alt={`Illustration ${index + 1}`}
              className="article-image"
              style={{ maxWidth: "100%", margin: "10px 0" }}
            />
          ))}
        </div>
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
