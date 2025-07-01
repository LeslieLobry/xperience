import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function GET(req, context) {
  try {
    console.log("📍 ID reçu dans API avis :", context.params.id);
    const id = context.params.id;

    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }

    const avis = await prisma.avis.findMany({
      where: { cibleId: parseInt(id, 10) },
      include: {
        auteur: {
          select: {
            id: true,
            pseudo: true,
            photoUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ avis });
  } catch (error) {
    console.error("Erreur dans API avis :", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
