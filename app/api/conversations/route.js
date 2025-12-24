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

    // 1) Normalisation des IDs (nombres + dédoublonnage)
    const body = await req.json();
    let ids = Array.isArray(body?.participantIds) ? body.participantIds : [];
    ids = [...new Set(ids.map((x) => Number(x)).filter(Number.isFinite))];

    if (ids.length < 2)
      return NextResponse.json({ error: "Participants invalides" }, { status: 400 });

    if (!ids.includes(currentUser.id))
      return NextResponse.json(
        { error: "Tu dois faire partie des participants." },
        { status: 403 }
      );

    const exclus = await getIdsUtilisateursExclus(currentUser.id);
    const autres = ids.filter((id) => id !== currentUser.id);
    if (autres.some((id) => exclus.includes(id)))
      return NextResponse.json(
        { error: "Impossible de créer une conversation avec un utilisateur bloqué." },
        { status: 403 }
      );

    // 2) EXISTING: match EXACT du set de participants
    const existingConv = await prisma.conversation.findFirst({
      where: {
        AND: [
          { participants: { every: { utilisateurId: { in: ids } } } },
          ...ids.map((id) => ({ participants: { some: { utilisateurId: id } } })),
        ],
      },
      include: {
        participants: { include: { utilisateur: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });

    if (existingConv) {
      // Restaure si ce user avait "supprimé" la conv
      const myParticipant = existingConv.participants.find(
        (p) => p.utilisateurId === currentUser.id
      );
      if (myParticipant?.supprimé) {
        await prisma.participant.update({
          where: { id: myParticipant.id },
          data: { supprimé: false },
        });
      }
      return NextResponse.json({ conversation: existingConv, existed: true });
    }

    // 3) CRÉATION
    const conversation = await prisma.conversation.create({
      data: {
        participants: {
          create: ids.map((id) => ({ utilisateurId: id })),
        },
      },
      include: {
        participants: {
          include: {
            utilisateur: { select: { id: true, pseudo: true, photoUrl: true } },
          },
        },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });

    return NextResponse.json({ conversation, created: true });
  } catch (err) {
    console.error("❌ Erreur POST /api/conversations :", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// ----------- LISTE / UNREADS (GET) -----------
// ----------- LISTE / UNREADS (GET) -----------

export async function GET() {
  try {
    const currentUser = await getUserFromToken();
    if (!currentUser)
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const userId = currentUser.id;

    // 1) conversations + participants + dernier message (1 query)
    const convs = await prisma.conversation.findMany({
      where: {
        participants: { some: { utilisateurId: userId, supprimé: false } },
      },
      include: {
        participants: {
          select: {
            id: true,
            utilisateurId: true,
            supprimé: true,
            lastReadAt: true,
            utilisateur: { select: { id: true, pseudo: true, photoUrl: true } },
          },
        },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { updatedAt: "desc" },
    });

    // 2) filtrage blocages
    const exclus = await getIdsUtilisateursExclus(userId);
    const visibleConvs = convs.filter((conv) =>
      conv.participants.every((p) => !exclus.includes(p.utilisateurId))
    );

    if (visibleConvs.length === 0) {
      return NextResponse.json({ conversations: [] });
    }

    // 3) unreadCount en 1 seul passage:
    // On récupère lastReadAt par conv, puis on fait un groupBy par conv
    const lastReadByConv = new Map();
    for (const conv of visibleConvs) {
      const me = conv.participants.find((p) => p.utilisateurId === userId);
      lastReadByConv.set(conv.id, me?.lastReadAt ?? new Date(0));
    }

    const convIds = visibleConvs.map((c) => c.id);

    // ⚠️ Prisma ne permet pas "createdAt > lastReadAt" différent par convId en 1 WHERE.
    // Donc on fait une stratégie FAST:
    // - on prend le minLastRead (le plus ancien) pour limiter les messages scannés
    // - puis on regroupe en mémoire (c’est très rapide et évite N requêtes)
    let minLastRead = new Date();
    for (const dt of lastReadByConv.values()) {
      if (dt < minLastRead) minLastRead = dt;
    }

    const msgs = await prisma.message.findMany({
      where: {
        conversationId: { in: convIds },
        auteurId: { not: userId },
        createdAt: { gt: minLastRead },
      },
      select: { conversationId: true, createdAt: true },
    });

    const unreadCounts = {};
    for (const m of msgs) {
      const lastRead = lastReadByConv.get(m.conversationId) ?? new Date(0);
      if (m.createdAt > lastRead) {
        unreadCounts[m.conversationId] = (unreadCounts[m.conversationId] || 0) + 1;
      }
    }

    const conversations = visibleConvs.map((conv) => ({
      ...conv,
      unreadCount: unreadCounts[conv.id] || 0,
      messages: conv.messages,
    }));

    return NextResponse.json({ conversations });
  } catch (err) {
    console.error("❌ Erreur GET /api/conversations :", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
