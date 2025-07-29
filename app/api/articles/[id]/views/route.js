import { prisma } from "../../../../../lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req, { params }) {
  const articleId = parseInt(params.id, 10);

  if (isNaN(articleId)) {
    console.warn("❌ ID invalide :", params.id);
    return NextResponse.json({ error: "ID invalide" }, { status: 400 });
  }

  console.log("🟡 Route appelée pour ID :", articleId);

  try {
    const updated = await prisma.article.update({
      where: { id: articleId },
      data: {
        vues: {
          increment: 1,
        },
      },
    });

    console.log("✅ Incrémentation réussie :", updated.vues);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Erreur incrémentation vues :", error);
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 });
  }
}
