import { prisma } from "../../../lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const articles = await prisma.article.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      images: true,
      auteur: true,
    },
  });

  return NextResponse.json(articles);
}
