import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

const isNumericId = (s = "") => /^\d+$/.test(String(s));
const isCuidLike = (s = "") => /^c[a-z0-9]+$/i.test(String(s));

function buildWhere(idOrSlug) {
  if (isNumericId(idOrSlug)) return { id: Number(idOrSlug) };
  if (isCuidLike(idOrSlug)) return { id: idOrSlug };
  return { slug: idOrSlug };
}

/* ✅ OPTIONS (préflight) */
export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

// ✅ GET : récupérer un article
export async function GET(_req, { params }) {
  const idOrSlug = params?.id;
  if (!idOrSlug)
    return NextResponse.json({ error: "id manquant" }, { status: 400 });

  try {
    const article = await prisma.article.findUnique({
      where: buildWhere(idOrSlug),
      include: { auteur: true, images: true },
    });

    if (!article)
      return NextResponse.json({ error: "Article introuvable" }, { status: 404 });

    return NextResponse.json(article);
  } catch (err) {
    console.error("[GET /api/articles/[id]]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// ✅ PUT : mettre à jour un article
export async function PUT(req, { params }) {
  const idOrSlug = params?.id;
  if (!idOrSlug)
    return NextResponse.json({ error: "id manquant" }, { status: 400 });

  const body = await req.json();
  const { titre, description, contenu, images } = body || {};

  if (!titre || !contenu)
    return NextResponse.json({ error: "Champs manquants" }, { status: 400 });

  try {
    const where = buildWhere(idOrSlug);

    const existing = await prisma.article.findUnique({
      where,
      include: { images: true },
    });
    if (!existing)
      return NextResponse.json({ error: "Article introuvable" }, { status: 404 });

    const newUrls = Array.isArray(images) ? images.filter(Boolean) : [];
    const oldUrls = existing.images.map((img) => img.url).filter(Boolean);

    const toDelete = oldUrls.filter((u) => !newUrls.includes(u));
    const toCreate = newUrls.filter((u) => !oldUrls.includes(u));

    const updated = await prisma.$transaction(async (tx) => {
      await tx.article.update({
        where,
        data: { titre, description: description ?? null, contenu },
      });

      // ✅ ICI : on supprime dans ImageArticle (pas articleImage)
      if (toDelete.length) {
        await tx.imageArticle.deleteMany({
          where: { articleId: existing.id, url: { in: toDelete } },
        });
      }

      if (toCreate.length) {
        await tx.imageArticle.createMany({
          data: toCreate.map((url) => ({ articleId: existing.id, url })),
        });
      }

      return tx.article.findUnique({
        where: { id: existing.id },
        include: { auteur: true, images: true },
      });
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[PUT /api/articles/[id]]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// ✅ DELETE : supprimer un article + ses images
export async function DELETE(_req, { params }) {
  const idOrSlug = params?.id;
  if (!idOrSlug)
    return NextResponse.json({ error: "id manquant" }, { status: 400 });

  try {
    const where = buildWhere(idOrSlug);

    const existing = await prisma.article.findUnique({
      where,
      select: { id: true },
    });

    if (!existing)
      return NextResponse.json({ error: "Article introuvable" }, { status: 404 });

    await prisma.$transaction(async (tx) => {
      // ✅ IMPORTANT : modèle = imageArticle
      await tx.imageArticle.deleteMany({
        where: { articleId: existing.id },
      });

      await tx.article.delete({
        where: { id: existing.id },
      });
    });

    return NextResponse.json({ ok: true, deletedId: existing.id });
  } catch (err) {
    console.error("[DELETE /api/articles/[id]]", err);
    return NextResponse.json(
      {
        error: "Erreur serveur",
        detail: err?.message || String(err),
        code: err?.code || null,
      },
      { status: 500 }
    );
  }
}
