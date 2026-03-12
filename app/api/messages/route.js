import { prisma } from "../../../lib/prisma";
import { getIdsUtilisateursExclus } from "../../../lib/utilsFiltrage";
import { getUserFromToken } from "../../../lib/auth";
import { v4 as uuidv4 } from "uuid";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import Ably from "ably";
import { sendPush } from "../../../lib/push";
import { logSiteEvent, SITE_EVENT_TYPES } from "../../../lib/siteEvents";

const ably = new Ably.Rest(process.env.ABLY_API_KEY_SERVER);

// Config S3
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.AWS_S3_BUCKET;

function pushPreview(type, contenu) {
  const c = (contenu || "").trim();
  if (type === "TEXTE") return c ? c.slice(0, 80) : "Nouveau message";
  if (type === "IMAGE") return "📷 Photo";
  if (type === "AUDIO") return "🎤 Message vocal";
  if (type === "VIDEO") return "🎥 Vidéo";
  if (type === "EPHEMERE") return "⚡ Snap éphémère";
  return "Nouveau message";
}

export async function POST(req) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let body = {};
    let file = null;

    if (contentType.includes("application/json")) {
      body = await req.json();
    } else if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();

      body = {
        conversationId: parseInt(formData.get("conversationId"), 10),
        contenu: formData.get("contenu"),
        type: formData.get("type"),
        imageUrl: null,
        audioUrl: null,
        videoUrl: null,
        envoyeur: formData.get("envoyeur") || null,
        prenom1: formData.get("prenom1") || null,
        prenom2: formData.get("prenom2") || null,
        duree: formData.get("duree") || null,
        optimisticKey: formData.get("optimisticKey") || null,
      };

      if (
        (body.type === "IMAGE" || body.type === "EPHEMERE") &&
        formData.get("image")
      ) {
        file = formData.get("image");
      } else if (
        (body.type === "AUDIO" || body.type === "EPHEMERE") &&
        formData.get("audio")
      ) {
        file = formData.get("audio");
      }
    } else {
      return NextResponse.json(
        { success: false, message: "Type non supporté" },
        { status: 400 }
      );
    }

    if (file && file.size > 0) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const ext = file.name.split(".").pop();
      const fileName =
        body.type === "EPHEMERE"
          ? `ephemere/snap_${uuidv4()}.${ext}`
          : `msg_${uuidv4()}.${ext}`;

      if (
        (body.type === "IMAGE" || body.type === "EPHEMERE") &&
        file.type.startsWith("image/")
      ) {
        try {
          const moderationForm = new FormData();
          moderationForm.append(
            "media",
            new Blob([buffer], { type: file.type }),
            file.name
          );
          moderationForm.append("models", "face-attributes");
          moderationForm.append("api_user", process.env.SIGHTENGINE_USER);
          moderationForm.append("api_secret", process.env.SIGHTENGINE_SECRET);

          const moderationRes = await fetch(
            "https://api.sightengine.com/1.0/check.json",
            {
              method: "POST",
              body: moderationForm,
            }
          );

          const moderationData = await moderationRes.json();

          if (moderationData?.faces?.length) {
            const hasMinor = moderationData.faces.some(
              (f) => f.attributes?.minor > 0.9
            );

            if (hasMinor) {
              return NextResponse.json(
                {
                  success: false,
                  message: "Image refusée : visage mineur détecté (IA).",
                },
                { status: 400 }
              );
            }
          }
        } catch (error) {
          console.error("Erreur modération image (message):", error);
          return NextResponse.json(
            { success: false, message: "Erreur analyse image." },
            { status: 500 }
          );
        }
      }

      await s3.send(
        new PutObjectCommand({
          Bucket: BUCKET,
          Key: fileName,
          Body: buffer,
          ContentType: file.type,
        })
      );

      if (file.type.startsWith("audio/")) {
        body.audioUrl = fileName;
      } else {
        body.imageUrl = fileName;
      }
    }

    const {
      conversationId,
      contenu,
      imageUrl,
      audioUrl,
      videoUrl,
      type,
      envoyeur,
    } = body;

    if (!conversationId || Number.isNaN(conversationId)) {
      return NextResponse.json(
        { success: false, message: "conversationId manquant" },
        { status: 400 }
      );
    }

    const user = await getUserFromToken();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Non autorisé" },
        { status: 401 }
      );
    }

    const auteurId = user.id;

    const [participants, exclus] = await Promise.all([
      prisma.participant.findMany({
        where: { conversationId },
        select: { utilisateurId: true },
      }),
      getIdsUtilisateursExclus(auteurId),
    ]);

    const autresParticipants = (participants || [])
      .map((p) => p.utilisateurId)
      .filter((id) => id !== auteurId);

    if (autresParticipants.some((id) => exclus.includes(id))) {
      return NextResponse.json(
        { success: false, message: "Utilisateur bloqué" },
        { status: 403 }
      );
    }

    const prenomEnvoyeur = body.prenomEnvoyeur || null;
    const isEphemere = type === "EPHEMERE";

    const message = await prisma.message.create({
      data: {
        conversationId,
        auteurId,
        contenu,
        imageUrl,
        audioUrl,
        videoUrl,
        type,
        duree: body.duree || null,
        lu: false,
        envoyeur: envoyeur || null,
        prenomEnvoyeur: prenomEnvoyeur || null,
        openedAt: null,
        expiresAt: isEphemere ? null : null,
      },
      include: {
        auteur: {
          select: {
            id: true,
            pseudo: true,
            photoUrl: true,
            type: true,
          },
        },
        reactions: {
          select: {
            emoji: true,
            utilisateurId: true,
            utilisateur: {
              select: {
                pseudo: true,
              },
            },
          },
        },
      },
    });

    // ✅ Tracking analytics admin : message envoyé
    setTimeout(() => {
      logSiteEvent({
        userId: auteurId,
        type: SITE_EVENT_TYPES.MESSAGE_SENT,
        metadata: {
          conversationId,
          messageId: message.id,
          messageType: type || null,
          hasMedia: Boolean(imageUrl || audioUrl || videoUrl),
          destinatairesCount: autresParticipants.length,
        },
      }).catch(console.error);
    }, 0);

    const optimisticKey = body.optimisticKey || null;
    const messageWithOptimisticKey = { ...message, optimisticKey };

    await Promise.all([
      ably.channels
        .get(`conversation-${conversationId}`)
        .publish("message", messageWithOptimisticKey),

      prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      }),
    ]);

    if (autresParticipants.length > 0) {
      await Promise.all([
        prisma.notification.createMany({
          data: autresParticipants.map((destId) => ({
            utilisateurId: destId,
            message: `${message.auteur.pseudo} vous a envoyé un nouveau message`,
            lien: `/messagerie?conversationId=${conversationId}`,
            lu: false,
          })),
        }),

        prisma.digestNotification.createMany({
          data: autresParticipants.map((destId) => ({
            destinataireId: destId,
            conversationId,
            messageId: message.id,
          })),
          skipDuplicates: true,
        }),
      ]);
    }

    if (autresParticipants.length > 0) {
      const dests = await prisma.utilisateur.findMany({
        where: { id: { in: autresParticipants } },
        select: { expoPushToken: true, pushEnabled: true },
      });

      const tokens = (dests || [])
        .filter((u) => u.pushEnabled && u.expoPushToken)
        .map((u) => u.expoPushToken);

      if (tokens.length) {
        const bodyText = pushPreview(message.type, message.contenu);

        try {
          await sendPush(tokens, {
            title: "Nouveau message 💬",
            body: bodyText,
            data: { type: "MESSAGE", conversationId: Number(conversationId) },
          });
        } catch (e) {
          console.warn("[POST /api/messages] échec envoi push:", e?.message || e);
        }
      }
    }

    if (autresParticipants.length > 0) {
      const preview = pushPreview(message.type, message.contenu);

      await Promise.all(
        autresParticipants.map(async (destId) => {
          try {
            await ably.channels.get(`user-${destId}`).publish("new-message", {
              conversationId: Number(conversationId),
              fromId: auteurId,
              fromPseudo: message.auteur.pseudo,
              preview,
              type: message.type,
            });
          } catch (e) {
            console.warn(
              "[POST /api/messages] erreur Ably user channel:",
              e?.message || e
            );
          }
        })
      );
    }

    return NextResponse.json(
      { success: true, message: messageWithOptimisticKey },
      { status: 200 }
    );
  } catch (err) {
    console.error("Erreur dans POST /api/messages :", err);
    return NextResponse.json(
      { success: false, message: "Erreur serveur" },
      { status: 500 }
    );
  }
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const conversationId = parseInt(searchParams.get("conversationId") || "", 10);
    const beforeIdRaw = searchParams.get("beforeId");
    const beforeId = beforeIdRaw ? parseInt(beforeIdRaw, 10) : null;
    const limit = Math.min(parseInt(searchParams.get("limit") || "30", 10), 50);

    if (!conversationId || Number.isNaN(conversationId)) {
      return NextResponse.json(
        { success: false, message: "conversationId manquant" },
        { status: 400 }
      );
    }

    const user = await getUserFromToken();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Non autorisé" },
        { status: 401 }
      );
    }

    const auteurId = user.id;
    const now = new Date();

    const [allParticipants, exclus] = await Promise.all([
      prisma.participant.findMany({
        where: { conversationId },
        select: {
          utilisateurId: true,
          lastReadAt: true,
          utilisateur: {
            select: {
              id: true,
              pseudo: true,
              photoUrl: true,
              type: true,
            },
          },
        },
      }),
      getIdsUtilisateursExclus(auteurId),
    ]);

    const autresParticipants = allParticipants
      .map((p) => p.utilisateurId)
      .filter((id) => id !== auteurId);

    if (autresParticipants.some((id) => exclus.includes(id))) {
      return NextResponse.json(
        { success: false, message: "Accès refusé à cette conversation." },
        { status: 403 }
      );
    }

    const where = {
      conversationId,
      ...(beforeId ? { id: { lt: beforeId } } : {}),
      AND: [
        {
          OR: [
            { type: { not: "EPHEMERE" } },
            { type: "EPHEMERE", expiresAt: null },
            { type: "EPHEMERE", expiresAt: { gt: now } },
          ],
        },
      ],
    };

    const rows = await prisma.message.findMany({
      where,
      orderBy: { id: "desc" },
      take: limit + 1,
      select: {
        id: true,
        contenu: true,
        imageUrl: true,
        videoUrl: true,
        audioUrl: true,
        duree: true,
        type: true,
        createdAt: true,
        auteurId: true,
        lu: true,
        openedAt: true,
        expiresAt: true,
        auteur: {
          select: {
            id: true,
            pseudo: true,
            photoUrl: true,
            type: true,
          },
        },
        envoyeur: true,
        prenomEnvoyeur: true,
        reactions: {
          select: {
            emoji: true,
            utilisateurId: true,
            utilisateur: {
              select: {
                pseudo: true,
              },
            },
          },
        },
      },
    });

    let hasMore = false;
    let messages = rows;

    if (rows.length > limit) {
      hasMore = true;
      messages = rows.slice(0, limit);
    }

    messages.reverse();

    const lastReads = allParticipants.map((p) => ({
      utilisateurId: p.utilisateurId,
      lastReadAt: p.lastReadAt,
    }));

    const participantsInfos = allParticipants.map((p) => p.utilisateur);

    let destinataire = null;
    if (participantsInfos.length === 2) {
      destinataire =
        participantsInfos.find((u) => u.id !== auteurId) || null;
    }

    return NextResponse.json(
      {
        success: true,
        messages,
        destinataire,
        participants: participantsInfos,
        lastReads,
        hasMore,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[GET /api/messages] erreur:", error);
    return NextResponse.json(
      { success: false, message: "Impossible de récupérer les messages." },
      { status: 500 }
    );
  }
}