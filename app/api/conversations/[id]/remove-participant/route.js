import { getUserFromToken } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req, { params }) {
  try {
    const { id } = params;
    const convId = parseInt(id, 10);
    const { userIdOrPseudo } = await req.json();
    const currentUser = await getUserFromToken();

    if (!currentUser) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    if (!convId || !userIdOrPseudo) {
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

    const isParticipant = conversation.participants.some(
      (p) => p.utilisateurId === currentUser.id
    );
    if (!isParticipant) {
      return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
    }

    // Résoudre l'utilisateur à retirer (par id numérique ou pseudo)
    const userToRemove =
      (Number.isFinite(Number(userIdOrPseudo)) &&
        (await prisma.utilisateur.findUnique({ where: { id: Number(userIdOrPseudo) } }))) ||
      (await prisma.utilisateur.findFirst({ where: { pseudo: userIdOrPseudo } }));

    if (!userToRemove) {
      return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
    }

    const isInConv = conversation.participants.some(
      (p) => p.utilisateurId === userToRemove.id
    );
    if (!isInConv) {
      return NextResponse.json({ error: "Cet utilisateur n'est pas dans la conversation." }, { status: 400 });
    }

    // Autorisations:
    // - l'utilisateur peut toujours se retirer lui-même (quitter)
    // - pour retirer quelqu'un d'autre, on autorise seulement si la conv a un "createurId" égal à currentUser.id (si ton schéma l'a)
    const canKickOthers =
      (conversation.createurId && conversation.createurId === currentUser.id) ||
      (conversation.ownerId && conversation.ownerId === currentUser.id); // au cas où ton schéma a ownerId

    if (userToRemove.id !== currentUser.id && !canKickOthers) {
      return NextResponse.json({ error: "Action non autorisée." }, { status: 403 });
    }

    // Supprimer la ligne de participation
    await prisma.participant.deleteMany({
      where: { conversationId: convId, utilisateurId: userToRemove.id },
    });

    return NextResponse.json({ success: true, removedId: userToRemove.id });
  } catch (err) {
    console.error("Erreur remove-participant:", err);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
