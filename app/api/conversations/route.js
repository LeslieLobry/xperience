import { prisma } from "../../../lib/prisma";
import { NextResponse } from "next/server";
import { getUserFromToken } from "../../../lib/auth";
import { getIdsUtilisateursExclus } from "../../../lib/utilsFiltrage";
import { Prisma } from "@prisma/client";

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

    // blocage si user bloqué
    const exclus = await getIdsUtilisateursExclus(currentUser.id);
    const autres = ids.filter((id) => id !== currentUser.id);
    if (autres.some((id) => exclus.includes(id))) {
      return NextResponse.json(
        { error: "Impossible de créer une conversation avec un utilisateur bloqué." },
        { status: 403 }
      );
    }

    // 2) EXISTING: match EXACT du set de participants
    const existingConv = await prisma.conversation.findFirst({
      where: {
        AND: [
          { participants: { every: { utilisateurId: { in: ids } } } },
          ...ids.map((id) => ({ participants: { some: { utilisateurId: id } } })),
        ],
      },
      include: {
        participants: {
          include: {
            utilisateur: { select: { id: true, pseudo: true, photoUrl: true } },
          },
        },
        messages: { orderBy: { createdAt: "desc" }, take: 1 }, // ✅ identique (full)
      },
    });

    if (existingConv) {
      // restaure si ce user avait "supprimé"
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
        messages: { orderBy: { createdAt: "desc" }, take: 1 }, // ✅ identique (full)
      },
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

    // ✅ 1) Conversations non supprimées pour ce user (inchangé)
    const convs = await prisma.conversation.findMany({
      where: {
        participants: { some: { utilisateurId: userId, supprimé: false } },
      },
      include: {
        participants: {
          include: {
            utilisateur: { select: { id: true, pseudo: true, photoUrl: true } },
          },
        },
        messages: { orderBy: { createdAt: "desc" }, take: 1 }, // ✅ identique (full)
      },
      orderBy: { updatedAt: "desc" },
    });

    // ✅ 2) Filtre "bloqués" (inchangé)
    const exclus = await getIdsUtilisateursExclus(userId);
    const visibleConvs = convs.filter((conv) =>
      conv.participants.every((p) => !exclus.includes(p.utilisateurId))
    );

    // ✅ 3) unreadCount: une seule requête groupée (REMPLACE le N+1)
    const convIds = visibleConvs.map((c) => c.id);
    let unreadCounts = {};

    if (convIds.length) {
      const rows = await prisma.$queryRaw`
        SELECT
          m."conversationId" AS "conversationId",
          COUNT(*)::int      AS "count"
        FROM "Message" m
        JOIN "Participant" p
          ON p."conversationId" = m."conversationId"
         AND p."utilisateurId" = ${userId}
         AND p."supprimé" = false
        WHERE m."conversationId" IN (${Prisma.join(convIds)})
          AND m."auteurId" <> ${userId}
          AND m."createdAt" > COALESCE(p."lastReadAt", to_timestamp(0))
        GROUP BY m."conversationId"
      `;

      unreadCounts = Object.fromEntries(
        (rows || []).map((r) => [Number(r.conversationId), Number(r.count)])
      );
    }

    // ✅ 4) Formatage retour (inchangé)
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
