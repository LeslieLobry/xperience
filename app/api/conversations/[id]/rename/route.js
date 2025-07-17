import { prisma } from "../../../../../lib/prisma";
import { NextResponse } from "next/server";
import { getUserFromToken } from "../../../../../lib/auth";

export async function PATCH(req, { params }) {
  let user;
  try {
    user = await getUserFromToken();
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
  } catch (err) {
    console.error("Erreur getUserFromToken:", err);
    return NextResponse.json({ error: "Erreur auth" }, { status: 500 });
  }

  const id = parseInt(params.id, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: "ID invalide" }, { status: 400 });
  }

  let nom;
  try {
    ({ nom } = await req.json());
    if (!nom || nom.trim().length < 2) {
      return NextResponse.json({ error: "Nom invalide" }, { status: 400 });
    }
  } catch (err) {
    console.error("Erreur parsing body:", err);
    return NextResponse.json({ error: "Erreur données" }, { status: 400 });
  }

  let conversation;
  try {
    conversation = await prisma.conversation.findUnique({
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
    if (conversation.nom === nom) {
      return NextResponse.json({ conversation });
    }
  } catch (err) {
    console.error("Erreur vérif conversation:", err);
    return NextResponse.json({ error: "Erreur DB conversation" }, { status: 500 });
  }

  let updated;
  try {
    updated = await prisma.conversation.update({
      where: { id },
      data: { nom },
    });
  } catch (err) {
    console.error("Erreur update conversation:", err);
    return NextResponse.json({ error: "Erreur update nom" }, { status: 500 });
  }
  try {
    await prisma.message.create({
      data: {
        conversationId: id,
        auteur: { connect: { id: user.id } },
        type: "SYSTEME",
        contenu: `${user.pseudo} a renommé la conversation en « ${nom} »`
      }
    });
    console.log("✅ Message système créé !");
  } catch (err) {
    console.error("Erreur création message SYSTEME :", err);
  }
  return NextResponse.json({ conversation: updated });
}
