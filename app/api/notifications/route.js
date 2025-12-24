import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { getUserFromToken } from "../../../lib/auth";

export async function GET() {
  try {
    const user = await getUserFromToken();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const notifications = await prisma.notification.findMany({
      where: { utilisateurId: user.id, lu: false },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        message: true,
        lien: true,
        createdAt: true,
        // ✅ NOUVEAU : infos de la personne qui like/visite
        auteur: {
          select: {
            id: true,
            prenom: true,
            pseudo: true,
            photoUrl: true,
          },
        },
      },
    });

    return NextResponse.json(notifications);
  } catch (error) {
    console.error("Erreur GET notifications:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PATCH() {
  try {
    const user = await getUserFromToken();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    await prisma.notification.updateMany({
      where: { utilisateurId: user.id, lu: false },
      data: { lu: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur PATCH notifications:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
