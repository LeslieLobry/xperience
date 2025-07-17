import { prisma } from "../../../../../lib/prisma";
import { NextResponse } from "next/server";
import { getUserFromToken } from "../../../../../lib/auth";

export async function PATCH(req, { params }) {
  const user = await getUserFromToken();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const id = parseInt(params.id, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: "ID invalide" }, { status: 400 });
  }

  const { nom } = await req.json();

  if (!nom || nom.trim().length < 2) {
    return NextResponse.json({ error: "Nom invalide" }, { status: 400 });
  }

  // Vérifie que l'utilisateur fait bien partie de la conversation
  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: { participants: true },
  });

  if (!conversation) {
    return NextResponse.json({ error: "Conversation introuvable" }, { status: 404 });
  }

  const isParticipant = conversation.participants.some(
    (p) => p.utilisateurId === user.id
  );
  if (!isParticipant) {
    return NextResponse.json({ error: "Accès interdit" }, { status: 403 });
  }

  // Évite le doublon si le nom est déjà le même (optionnel)
  if (conversation.nom === nom) {
    return NextResponse.json({ conversation });
  }

  // Met à jour le nom
  const updated = await prisma.conversation.update({
    where: { id },
    data: { nom },
  });

  // Message système
await prisma.message.create({
  data: {
    conversationId: id,
    auteur: { connect: { id: user.id } },
    type: "SYSTEME",
    contenu: `${user.pseudo} a renommé la conversation en « ${nom} »`
  }
});
  return NextResponse.json({ conversation: updated });
}
