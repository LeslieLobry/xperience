import { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { redirect } from "next/navigation";
import "./blog.css";

const prisma = new PrismaClient();
const secret = process.env.JWT_SECRET;
if (!secret) throw new Error("JWT_SECRET non défini");

export default async function BlogPage() {
  const token = cookies().get("token")?.value;

  if (!token) return redirect("/connexion");

  let decoded;
  try {
    decoded = jwt.verify(token, secret);
  } catch {
    return redirect("/connexion");
  }

  const articles = await prisma.article.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="blog-container">
      <h1 className="blog-title">Blog</h1>
      {articles.map((article) => {
  console.log("SLUG ->", article.slug); // ← ajoute ça
  return (
    <div key={article.id} className="blog-article">
      <h2>
        <a href={`/blog/${article.slug}`} className="blog-link">
          {article.titre}
        </a>
      </h2>
      <p className="blog-date">
        Publié le {new Date(article.createdAt).toLocaleDateString()}
      </p>
    </div>
  );
})}

    </div>
  );
}
