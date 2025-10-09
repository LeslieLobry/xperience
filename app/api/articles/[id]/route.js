// app/api/articles/[idOrSlug]/route.js
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const isNumericId = (s="") => /^\d+$/.test(String(s));
const isCuidLike  = (s="") => /^c[a-z0-9]+$/i.test(String(s));

function buildWhere(idOrSlug) {
  if (isNumericId(idOrSlug)) return { id: Number(idOrSlug) }; // ancien schéma INT
  if (isCuidLike(idOrSlug))  return { id: idOrSlug };         // nouveau schéma STRING cuid
  return { slug: idOrSlug };                                  // fallback: slug
}

export async function GET(_req, { params }) {
  const idOrSlug = params?.idOrSlug;
  if (!idOrSlug) return NextResponse.json({ error: "missing idOrSlug" }, { status: 400 });
  try {
    const article = await prisma.article.findUnique({
      where: buildWhere(idOrSlug),
      include: { images: true, auteur: true },
    });
    if (!article) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json(article);
  } catch (e) {
    console.error("GET /api/articles/[idOrSlug]", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  const idOrSlug = params?.idOrSlug;
  if (!idOrSlug) return NextResponse.json({ error: "missing idOrSlug" }, { status: 400 });

  const body = await req.json();
  const { titre, description, contenu, images } = body || {};
  if (!titre || !contenu) {
    return NextResponse.json({ error: "titre et contenu requis" }, { status: 400 });
  }

  const where = buildWhere(idOrSlug);

  try {
    const existing = await prisma.article.findUnique({ where, include: { images: true } });
    if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });

    // Harmonise les clés d'images (array de strings)
    const newKeys = Array.isArray(images) ? images.map(i => (typeof i === "string" ? i : i?.key || i?.url)).filter(Boolean) : [];
    const oldKeys = existing.images.map(img => img.key ?? img.url ?? img.path).filter(Boolean);

    const toDelete = oldKeys.filter(k => !newKeys.includes(k));
    const toCreate = newKeys.filter(k => !oldKeys.includes(k));

    const updated = await prisma.$transaction(async (tx) => {
      const base = await tx.article.update({
        where,
        data: { titre, description: description ?? null, contenu, updatedAt: new Date() },
      });

      // ⚠️ Aligne le nom du modèle image : articleImage ou imageArticle
      if (toDelete.length) {
        await tx.articleImage.deleteMany({ where: { articleId: base.id, key: { in: toDelete } } });
      }
      if (toCreate.length) {
        await tx.articleImage.createMany({ data: toCreate.map(key => ({ articleId: base.id, key })) });
      }

      return tx.article.findUnique({ where: { id: base.id }, include: { images: true, auteur: true } });
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error("PUT /api/articles/[idOrSlug]", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}

export async function DELETE(_req, { params }) {
  const idOrSlug = params?.idOrSlug;
  if (!idOrSlug) return NextResponse.json({ error: "missing idOrSlug" }, { status: 400 });
  const where = buildWhere(idOrSlug);

  try {
    const existing = await prisma.article.findUnique({ where });
    if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });

    await prisma.$transaction(async (tx) => {
      await tx.articleImage.deleteMany({ where: { articleId: existing.id } });
      await tx.article.delete({ where: { id: existing.id } });
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/articles/[idOrSlug]", e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
