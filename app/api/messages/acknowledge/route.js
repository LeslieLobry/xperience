import { prisma } from "../../../../lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req) {
  const { messageId } = await req.json();

  if (!messageId) {
    return NextResponse.json({ error: "ID manquant" }, { status: 400 });
  }

  try {
    await prisma.message.update({
      where: { id: messageId },
      data: { lu: true },
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("❌ Erreur acknowledge :", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
