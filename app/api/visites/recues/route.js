import { getUserFromToken } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const user = await getUserFromToken();
    if (!user) {
      console.warn("🔒 Utilisateur non authentifié");
      return NextResponse.json([], { status: 200 });
    }

    const visites = await prisma.visiteProfil.findMany({
      where: { visiteId: user.id },
      orderBy: { date: "desc" },
      include: {
        visiteur: {
          select: {
            id: true,
            pseudo: true,
            photoUrl: true,
          },
        },
      },
    });

    console.log("📥 Visites REÇUES pour l'utilisateur", user.id, ":", visites.length);
    return NextResponse.json(visites);
  } catch (error) {
    console.error("❌ Erreur API /visites/recues :", error);
    return NextResponse.json([], { status: 500 });
  }
}
