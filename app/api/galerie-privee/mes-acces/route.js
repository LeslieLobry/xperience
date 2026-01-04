import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getUserFromToken } from "../../../../lib/auth";

export const runtime = "nodejs";

export async function GET(req) {
  try {
    const me = await getUserFromToken(req);
    if (!me?.id) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

    const rows = await prisma.demandeAcces.findMany({
      where: { demandeurId: Number(me.id), statut: "ACCEPTEE" },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        statut: true,
        updatedAt: true,
        proprietaire: { select: { id: true, pseudo: true, photoUrl: true } },
        galeriePrivee: { select: { id: true, nom: true, utilisateurId: true } },
      },
    });

    return NextResponse.json(rows, { status: 200 });
  } catch (e) {
    console.error("mes-acces galerie privée error", e);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
