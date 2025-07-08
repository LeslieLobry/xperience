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


    if (Array.isArray(images)) {
      await prisma.imageArticle.deleteMany({ where: { articleId: id } });
      const data = images.map((img) => ({
        url: typeof img === "string" ? img : img.url,
        articleId: id,
      }));

      if (data.length > 0) {
        await prisma.imageArticle.createMany({ data });
      }
    }
    // Sinon : ne rien toucher, les images restent inchangées

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
export async function DELETE(req, { params }) {
  const { id } = params;

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
