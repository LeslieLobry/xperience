import { prisma } from "../../../lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const utilisateurs = await prisma.utilisateur.findMany({
      select: {
        id: true,
        pseudo: true,
        photoUrl: true,
      },
      orderBy: { pseudo: "asc" },
    });

    return NextResponse.json({ utilisateurs });
  } catch (err) {
    console.error("❌ Erreur chargement utilisateurs :", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
