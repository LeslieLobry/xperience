import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

const isNumericId = (s = "") => /^\d+$/.test(String(s));
const isCuidLike = (s = "") => /^c[a-z0-9]+$/i.test(String(s));

function buildWhere(idOrSlug) {
  if (isNumericId(idOrSlug)) return { id: Number(idOrSlug) };
  if (isCuidLike(idOrSlug)) return { id: idOrSlug };
  return { slug: idOrSlug };
}

// ✅ GET : récupérer un article
export async function GET(_req, { params }) {
  const idOrSlug = params?.idOrSlug;
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
    console.error("[GET /api/articles/[idOrSlug]]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// ✅ PUT : mettre à jour un article
export async function PUT(req, { params }) {
  const idOrSlug = params?.idOrSlug;
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

    const newKeys = Array.isArray(images)
      ? images.filter(Boolean)
      : [];
    const oldKeys = existing.images.map(
      (img) => img.key ?? img.url ?? img.path
    ).filter(Boolean);

    const toDelete = oldKeys.filter((k) => !newKeys.includes(k));
    const toCreate = newKeys.filter((k) => !oldKeys.includes(k));

    const updated = await prisma.$transaction(async (tx) => {
      await tx.article.update({
        where,
        data: { titre, description: description ?? null, contenu },
      });

      if (toDelete.length)
        await tx.articleImage.deleteMany({
          where: { articleId: existing.id, key: { in: toDelete } },
        });

      if (toCreate.length)
        await tx.articleImage.createMany({
          data: toCreate.map((key) => ({ articleId: existing.id, key })),
        });

      return tx.article.findUnique({
        where: { id: existing.id },
        include: { auteur: true, images: true },
      });
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[PUT /api/articles/[idOrSlug]]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
