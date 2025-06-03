import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function GET() {
  try {
    const articles = await prisma.article.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        titre: true,
        slug: true,
        createdAt: true,
        images: {
          select: { url: true }
        }
      },
    });
    return NextResponse.json({ articles });
  } catch (err) {
    console.error("Erreur GET /api/articles/dernieres :", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
