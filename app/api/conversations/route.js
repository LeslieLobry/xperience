import { prisma } from "../../../lib/prisma";
import { NextResponse } from "next/server";
import { getUserFromToken } from "../../../lib/auth";
import { getIdsUtilisateursExclus } from "../../../lib/utilsFiltrage";

// ----------- CRÉATION (POST) -----------
export async function POST(req) {
  try {
    const currentUser = await getUserFromToken();
    if (!currentUser)
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const { participantIds } = await req.json();
    if (!Array.isArray(participantIds) || participantIds.length < 2)
      return NextResponse.json({ error: "Participants invalides" }, { status: 400 });

    if (!participantIds.includes(currentUser.id))
      return NextResponse.json({ error: "Tu dois faire partie des participants." }, { status: 403 });

    const exclus = await getIdsUtilisateursExclus(currentUser.id);
    const autres = participantIds.filter((id) => id !== currentUser.id);

    if (autres.some((id) => exclus.includes(id)))
      return NextResponse.json(
        { error: "Impossible de créer une conversation avec un utilisateur bloqué." },
        { status: 403 }
      );

    // Vérifie existence (même set d'ids)
    const existingConv = await prisma.conversation.findFirst({
      where: {
        participants: {
          every: { utilisateurId: { in: participantIds } },
        },
        AND: [
          { participants: { every: { utilisateurId: { in: participantIds } } } },
          { participants: { none: { utilisateurId: { notIn: participantIds } } } }
        ]
      },
      include: {
        participants: { include: { utilisateur: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 }
      }
    });

    if (existingConv) {
      // Restaure s'il a été supprimé
      const myParticipant = existingConv.participants.find(p => p.utilisateurId === currentUser.id);
      if (myParticipant && myParticipant.supprimé) {
        await prisma.participant.update({
          where: { id: myParticipant.id },
          data: { supprimé: false }
        });
      }
      return NextResponse.json({ conversation: existingConv, existed: true });
    }

    // Sinon, création !
    const conversation = await prisma.conversation.create({
      data: {
        participants: {
          create: participantIds.map((id) => ({ utilisateurId: id }))
        }
      },
      include: {
        participants: { include: { utilisateur: { select: { id: true, pseudo: true, photoUrl: true } } } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 }
      }
    });

    return NextResponse.json({ conversation, created: true });
  } catch (err) {
    console.error("❌ Erreur POST /api/conversations :", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// ----------- LISTE / UNREADS (GET) -----------
export async function GET() {
  try {
    const currentUser = await getUserFromToken();
    if (!currentUser)
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    const userId = currentUser.id;

    // On récupère toutes les conversations non supprimées pour ce user
    const convs = await prisma.conversation.findMany({
      where: {
        participants: { some: { utilisateurId: userId, supprimé: false } }
      },
      include: {
        participants: { include: { utilisateur: { select: { id: true, pseudo: true, photoUrl: true } } } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 }
      },
      orderBy: { updatedAt: "desc" }
    });

    // Pour bloquer l'affichage si un bloqué est présent
    const exclus = await getIdsUtilisateursExclus(userId);
    const visibleConvs = convs.filter(conv =>
      conv.participants.every(p => !exclus.includes(p.utilisateurId))
    );

    // 1 requête groupBy pour tous les unreadCount d'un coup !
    const unreadCountsRaw = await prisma.message.groupBy({
      by: ["conversationId"],
      where: {
        lu: false,
        auteurId: { not: userId },
        conversationId: { in: visibleConvs.map(c => c.id) }
      },
      _count: { id: true }
    });
    const unreadCounts = Object.fromEntries(
      unreadCountsRaw.map(row => [row.conversationId, row._count.id])
    );

    // Formatage retour
    const conversations = visibleConvs.map(conv => ({
      ...conv,
      unreadCount: unreadCounts[conv.id] || 0,
      messages: conv.messages
    }));

    return NextResponse.json({ conversations });
  } catch (err) {
    console.error("❌ Erreur GET /api/conversations :", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
