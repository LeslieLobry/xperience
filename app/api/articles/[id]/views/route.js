import { prisma } from "../../../../../lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req, { params }) {
  const articleId = parseInt(params.id);

  if (isNaN(articleId)) {
    return NextResponse.json({ error: "ID invalide" }, { status: 400 });
  }

  try {
    await prisma.article.update({
      where: { id: articleId },
      data: {
        vues: {
          increment: 1,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur incrémentation vues :", error);
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 });
  }
}
