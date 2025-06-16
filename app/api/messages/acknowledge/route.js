import { prisma } from "../../../../lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req) {
  const { messageId, utilisateurId, statut } = await req.json();

  if (!messageId || !utilisateurId) {
    return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
  }

  try {
    const message = await prisma.message.update({
      where: { id: messageId },
      data: {
        recu: statut === "recu" ? true : undefined,
        lu: statut === "vu" ? true : undefined,
      },
    });

    return NextResponse.json({ message });
  } catch (err) {
    console.error("❌ Erreur acknowledge :", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
