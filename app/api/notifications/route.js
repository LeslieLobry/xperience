import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { getUserFromToken } from "../../../lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const user = await getUserFromToken(req);
    if (!user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const notifications = await prisma.notification.findMany({
      where: { utilisateurId: Number(user.id), lu: false },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        message: true,
        lien: true,
        createdAt: true,
        auteur: {
          select: {
            id: true,
            pseudo: true,
            photoUrl: true,
            // si tu veux vraiment pas exposer prenom :
            // prenom: false (pas possible en select)
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

export async function PATCH(req) {
  try {
    const user = await getUserFromToken(req);
    if (!user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    await prisma.notification.updateMany({
      where: { utilisateurId: Number(user.id), lu: false },
      data: { lu: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur PATCH notifications:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
