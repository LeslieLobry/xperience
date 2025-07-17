import { getUserFromToken } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req, { params }) {
  try {
    const { id } = params;
    const convId = parseInt(id, 10); // ← Correction ici
    const { userIdOrPseudo } = await req.json();
    const currentUser = await getUserFromToken();

    if (!currentUser) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    if (!convId || !userIdOrPseudo) return NextResponse.json({ error: "Paramètres manquants." }, { status: 400 });

    // Récupère la conversation et vérifie que currentUser y participe
    const conversation = await prisma.conversation.findUnique({
      where: { id: convId },
      include: { participants: true },
    });
    if (!conversation) return NextResponse.json({ error: "Conversation introuvable." }, { status: 404 });

    const isParticipant = conversation.participants.some(
      (p) => p.utilisateurId === currentUser.id
    );
    if (!isParticipant) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

    // Trouve l'utilisateur à ajouter (par id ou pseudo)
    const userToAdd =
      await prisma.utilisateur.findUnique({
        where: { id: userIdOrPseudo },
      }) ||
      await prisma.utilisateur.findFirst({
        where: { pseudo: userIdOrPseudo },
      });

    if (!userToAdd)
      return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });

    if (conversation.participants.some((p) => p.utilisateurId === userToAdd.id)) {
      return NextResponse.json({ error: "Cet utilisateur est déjà dans la conversation." }, { status: 400 });
    }

    // Ajoute le participant
    await prisma.participant.create({
      data: {
        conversationId: convId, // ← Correction ici
        utilisateurId: userToAdd.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Erreur add-participant:", err);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
