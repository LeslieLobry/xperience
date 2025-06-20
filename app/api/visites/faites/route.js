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
      where: { visiteurId: user.id },
      orderBy: { date: "desc" },
      include: {
        visite: {
          select: {
            id: true,
            pseudo: true,
            photoUrl: true,
          },
        },
      },
    });

    console.log("📤 Visites FAITES par l'utilisateur", user.id, ":", visites.length);
    return NextResponse.json(visites);
  } catch (error) {
    console.error("❌ Erreur API /visites/faites :", error);
    return NextResponse.json([], { status: 500 });
  }
}
