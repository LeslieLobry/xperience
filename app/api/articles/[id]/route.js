import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

// ✅ GET : récupérer l'article pour l'édition
export async function GET(req, { params }) {
  const { id } = params;

  try {
    const article = await prisma.article.findUnique({
      where: { id },
      include: { images: true, auteur: true },
    });

    if (!article) {
      return NextResponse.json(
        { success: false, message: "Article introuvable." },
        { status: 404 }
      );
    }

    return NextResponse.json(article);
  } catch (error) {
    console.error("Erreur GET article:", error);
    return NextResponse.json(
      { success: false, message: "Erreur serveur." },
      { status: 500 }
    );
  }
}

// ✅ PUT : mettre à jour l'article et ses images
export async function PUT(req, { params }) {
  const { id } = params;
  const body = await req.json();
  const { titre, description, contenu, images } = body;

  if (!titre || !contenu) {
    return NextResponse.json(
      { success: false, message: "Champs manquants." },
      { status: 400 }
    );
  }

  try {
    const updatedArticle = await prisma.article.update({
      where: { id },
      data: {
        titre,
        description,
        contenu,
        updatedAt: new Date(),
      },
    });

    // 🧹 Supprimer toutes les anciennes images
    await prisma.imageArticle.deleteMany({
      where: { articleId: id },
    });

    // ➕ Ajouter les nouvelles images
    if (Array.isArray(images)) {
      const data = images.map((url) => ({
        url,
        articleId: id,
      }));

      await prisma.imageArticle.createMany({ data });
    }

    return NextResponse.json({ success: true, article: updatedArticle });
  } catch (error) {
    console.error("Erreur mise à jour article :", error);
    return NextResponse.json(
      { success: false, message: "Erreur serveur." },
      { status: 500 }
    );
  }
}

// ✅ DELETE : supprimer un article + ses images
export async function DELETE(request, context) {
  const params = await context.params;
  const id = params.id;

  try {
    await prisma.imageArticle.deleteMany({
      where: { articleId: id },
    });

    await prisma.article.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur suppression article:", error);
    return NextResponse.json(
      { success: false, message: "Erreur serveur." },
      { status: 500 }
    );
  }
}


