import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma"; // ⬅️ réutilise le singleton

// ✅ GET : récupérer un article par ID (numérique)
export async function GET(_req, { params }) {
  const articleId = Number(params.id);
  if (!Number.isFinite(articleId)) {
    return NextResponse.json({ ok: false, error: "id invalide" }, { status: 400 });
  }

  try {
    const article = await prisma.article.findUnique({
      where: { id: articleId },
      include: { images: true, auteur: true },
    });

    if (!article) {
      return NextResponse.json({ ok: false, error: "Article introuvable" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, article });
  } catch (error) {
    console.error("Erreur GET /api/articles/[id]:", error);
    return NextResponse.json({ ok: false, error: "Erreur serveur" }, { status: 500 });
  }
}

// ✅ PUT : mettre à jour un article + ses images (transaction)
export async function PUT(req, { params }) {
  const articleId = Number(params.id);
  if (!Number.isFinite(articleId)) {
    return NextResponse.json({ ok: false, error: "id invalide" }, { status: 400 });
  }

  const { titre, description, contenu, images } = await req.json();
  if (!titre || !contenu) {
    return NextResponse.json({ ok: false, error: "Champs manquants" }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.article.update({
        where: { id: articleId },
        data: { titre, description, contenu, updatedAt: new Date() },
      });

      if (Array.isArray(images)) {
        await tx.imageArticle.deleteMany({ where: { articleId } });
        const data = images.map((img) => ({
          url: typeof img === "string" ? img : img?.url,
          articleId,
        })).filter((i) => i.url);
        if (data.length) await tx.imageArticle.createMany({ data });
      }

      return updated;
    });

    return NextResponse.json({ ok: true, article: result });
  } catch (error) {
    console.error("Erreur PUT /api/articles/[id]:", error);
    return NextResponse.json({ ok: false, error: "Erreur serveur" }, { status: 500 });
  }
}

// ✅ DELETE : supprimer un article + ses images (transaction)
export async function DELETE(_req, { params }) {
  const articleId = Number(params.id);
  if (!Number.isFinite(articleId)) {
    return NextResponse.json({ ok: false, error: "id invalide" }, { status: 400 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.imageArticle.deleteMany({ where: { articleId } });
      await tx.article.delete({ where: { id: articleId } });
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Erreur DELETE /api/articles/[id]:", error);
    return NextResponse.json({ ok: false, error: "Erreur serveur" }, { status: 500 });
  }
}
