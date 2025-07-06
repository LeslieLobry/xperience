import { prisma } from "../../../../lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req) {
  const { messageId } = await req.json();

  if (!messageId) {
    return NextResponse.json({ error: "ID manquant" }, { status: 400 });
  }

  try {
    // Ici, tu peux simplement mettre à jour le champ 'recu' (si tu l’as dans ton schéma)
    await prisma.message.update({
      where: { id: messageId },
      data: { recu: true },
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("❌ Erreur acknowledge :", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
