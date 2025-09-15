import { getUserFromToken } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req, { params }) {
  try {
    const convId = Number(params.id);
    const { userIdOrPseudo } = await req.json();
    const currentUser = await getUserFromToken();

    if (!currentUser) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    if (!Number.isFinite(convId) || !userIdOrPseudo) {
      return NextResponse.json({ error: "Paramètres manquants." }, { status: 400 });
    }

    // Conversation + participants
    const conversation = await prisma.conversation.findUnique({
      where: { id: convId },
      include: { participants: true }, // participants: { utilisateurId }
    });
    if (!conversation) {
      return NextResponse.json({ error: "Conversation introuvable." }, { status: 404 });
    }

    // ⚠️ Règle: tout participant peut retirer qui il veut
    const callerIsParticipant = conversation.participants.some(
      (p) => p.utilisateurId === currentUser.id
    );
    if (!callerIsParticipant) {
      return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
    }

    // Résoudre la cible (id numérique OU pseudo)
    let target = null;
    const asNumber = Number(userIdOrPseudo);
    if (Number.isFinite(asNumber)) {
      target = await prisma.utilisateur.findUnique({ where: { id: asNumber } });
    }
    if (!target) {
      target = await prisma.utilisateur.findFirst({ where: { pseudo: String(userIdOrPseudo) } });
    }
    if (!target) {
      return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
    }

    const targetInConv = conversation.participants.some(
      (p) => p.utilisateurId === target.id
    );
    if (!targetInConv) {
      return NextResponse.json({ error: "Cet utilisateur n'est pas dans la conversation." }, { status: 400 });
    }

    // (Optionnel) Empêcher de vider entièrement la conversation :
    // const remaining = conversation.participants.filter(p => p.utilisateurId !== target.id);
    // if (remaining.length === 0) {
    //   return NextResponse.json({ error: "Impossible de retirer le dernier participant." }, { status: 400 });
    // }

    await prisma.participant.deleteMany({
      where: { conversationId: convId, utilisateurId: target.id },
    });

    // Participants à jour pour rafraîchir le client
    const left = await prisma.utilisateur.findMany({
      where: { participants: { some: { conversationId: convId } } },
      select: { id: true, pseudo: true, email: true, photoUrl: true },
      orderBy: { pseudo: "asc" },
    });

    return NextResponse.json({ success: true, removedId: target.id, participants: left });
  } catch (err) {
    console.error("Erreur remove-participant:", err);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
