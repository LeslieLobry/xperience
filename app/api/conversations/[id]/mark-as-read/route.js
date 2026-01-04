// app/api/conversations/[id]/mark-as-read/route.js
import { prisma } from "../../../../../lib/prisma";
import { NextResponse } from "next/server";

// POST /api/conversations/{conversationId}/mark-as-read
export async function POST(req, { params }) {
  try {
    const conversationId = parseInt(params.id, 10);
    const body = await req.json().catch(() => ({}));
    const userId = body?.userId ? Number(body.userId) : null;

    if (!conversationId || !userId) {
      return NextResponse.json(
        { error: "conversationId et userId requis" },
        { status: 400 }
      );
    }

    // Met à jour lastReadAt pour ce participant
    const result = await prisma.participant.updateMany({
      where: {
        conversationId: conversationId,
        utilisateurId: userId,
      },
      data: {
        lastReadAt: new Date(),
      },
    });

    if (result.count === 0) {
      return NextResponse.json(
        { error: "Participant introuvable" },
        { status: 404 }
      );
    }

    // Marque tous les messages comme "lu" pour cet utilisateur (sauf les siens)
    await prisma.message.updateMany({
      where: {
        conversationId,
        auteurId: { not: userId },
        lu: false,
      },
      data: { lu: true },
    });

    // ✅ FIX NOTIFS : ton modèle Notification n'a pas conversationId/type
    // On "consomme" donc les notifs de messages via le champ `lien` (ou `message`) qui contient l'id conversation.
    const convStr = String(conversationId);

    await prisma.notification.updateMany({
      where: {
        utilisateurId: userId,
        lu: false,
        OR: [
          // Adapte ces patterns si besoin selon TON format de lien
          { lien: { contains: convStr } },
          { message: { contains: convStr } },
        ],
      },
      data: { lu: true },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Erreur mark-as-read:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
