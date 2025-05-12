import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function GET() {
  const articles = await prisma.article.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      images: true,     // ✅ ajoute les images
      auteur: true,     // ✅ ajoute les infos sur l’auteur
    },
  });

  return NextResponse.json(articles);
}
