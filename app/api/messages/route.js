import { prisma } from "../../../lib/prisma";
import { getIdsUtilisateursExclus } from "../../../lib/utilsFiltrage";
import { getUserFromToken } from "../../../lib/auth";
import { v4 as uuidv4 } from "uuid";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import Ably from "ably";

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

export async function POST(req) {
  console.log("⇒ POST /api/messages déclenché");
  console.log("POST /api/messages CONTENT-TYPE:", req.headers.get("content-type"));
  let debugBody = "";
  try {
    debugBody = await req.clone().text();
  } catch {}

  try {
    const contentType = req.headers.get("content-type") || "";
    let body = {};
    let file = null;

    if (contentType.includes("application/json")) {
      body = await req.json();
    } else if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      body = {
        conversationId: parseInt(formData.get("conversationId")),
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

      // Sélection du fichier selon le type et présence dans formData
      if ((body.type === "IMAGE" || body.type === "EPHEMERE") && formData.get("image")) {
        file = formData.get("image");
      } else if ((body.type === "AUDIO" || body.type === "EPHEMERE") && formData.get("audio")) {
        file = formData.get("audio");
      }
    } else {
      return NextResponse.json({ error: "Type non supporté" }, { status: 400 });
    }

    // Upload S3 si fichier fourni
    if (file && file.size > 0) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const ext = file.name.split(".").pop();
      let fileName;

      if (body.type === "EPHEMERE") {
        fileName = `ephemere/snap_${uuidv4()}.${ext}`;
      } else {
        fileName = `msg_${uuidv4()}.${ext}`;
      }

      // Détection mineur (Sightengine) si IMAGE ou EPHEMERE
      if (
        (body.type === "IMAGE" || body.type === "EPHEMERE") &&
        file.type.startsWith("image/")
      ) {
        try {
          const moderationForm = new FormData();
          moderationForm.append("media", new Blob([buffer], { type: file.type }), file.name);
          moderationForm.append("models", "face-attributes");
          moderationForm.append("api_user", process.env.SIGHTENGINE_USER);
          moderationForm.append("api_secret", process.env.SIGHTENGINE_SECRET);

          const moderationRes = await fetch("https://api.sightengine.com/1.0/check.json", {
            method: "POST",
            body: moderationForm,
          });

          const moderationData = await moderationRes.json();

          console.log("🧠 [CHAT] Sightengine:", JSON.stringify(moderationData, null, 2));

          if (moderationData?.faces?.length) {
            const hasMinor = moderationData.faces.some((f) => f.attributes?.minor > 0.9);
            if (hasMinor) {
              return NextResponse.json(
                { success: false, message: "Image refusée : visage mineur détecté (IA)." },
                { status: 400 }
              );
            }
          }
        } catch (error) {
          console.error("Erreur modération image (message):", error);
          return NextResponse.json({ success: false, message: "Erreur analyse image." }, { status: 500 });
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

      // STOCKE UNIQUEMENT LA CLÉ S3 (et non l’URL complète)
      if (file.type.startsWith("audio/")) {
        body.audioUrl = fileName; // Ex: msg_*.mp3 ou ephemere/snap_*.mp3
      } else {
        body.imageUrl = fileName; // Ex: msg_*.jpg ou ephemere/snap_*.jpg
      }
    }

    const { conversationId, contenu, imageUrl, audioUrl, videoUrl, type, envoyeur } = body;
    const user = await getUserFromToken();
    if (!user) {
      return NextResponse.json({ success: false, message: "Non autorisé" }, { status: 401 });
    }

    const auteurId = user.id;

    // Participants de la conversation
    const participants = await prisma.participant.findMany({
      where: { conversationId },
      select: { utilisateurId: true },
    });

    const autresParticipants = participants
      .map((p) => p.utilisateurId)
      .filter((id) => id !== auteurId);

    // Vérifie si certains participants sont bloqués
    const exclus = await getIdsUtilisateursExclus(auteurId);
    if (autresParticipants.some((id) => exclus.includes(id))) {
      return NextResponse.json({ success: false, message: "Utilisateur bloqué" }, { status: 403 });
    }

    let prenomEnvoyeur = body.prenomEnvoyeur || null;

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
      },
      include: {
        auteur: {
          select: { id: true, pseudo: true, photoUrl: true, type: true },
        },
        reactions: {
          select: {
            emoji: true,
            utilisateurId: true,
            utilisateur: { select: { pseudo: true } },
          },
        },
      },
    });

    // PATCH: Ajoute optimisticKey pour le front
    const optimisticKey = body.optimisticKey || null;
    const messageWithOptimisticKey = { ...message, optimisticKey };

    // Publish Ably avec optimisticKey
    await ably.channels.get(`conversation-${conversationId}`).publish("message", messageWithOptimisticKey);

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    await Promise.all(
      autresParticipants.map((destId) =>
        prisma.notification.create({
          data: {
            utilisateurId: destId,
            message: `${message.auteur.pseudo} vous a envoyé un nouveau message`,
            lien: `/messagerie?conversationId=${conversationId}`,
            lu: false,
          },
        })
      )
    );

    // ⬇️⬇️⬇️ DIGEST QUOTIDIEN : on empile pour envoi plus tard
    if (autresParticipants.length > 0) {
      await prisma.digestNotification.createMany({
        data: autresParticipants.map((destId) => ({
          destinataireId: destId,
          conversationId,
          messageId: message.id,
        })),
        skipDuplicates: true, // évite doublons si retry réseau
      });
    }
    // ⬆️⬆️⬆️ Fin digest — plus d'email immédiat ici

    // ✅ Réponse API avec optimisticKey inclus
    return NextResponse.json({ success: true, message: messageWithOptimisticKey }, { status: 200 });
  } catch (err) {
    console.error("Erreur dans POST /api/messages :", err);
    return NextResponse.json({ success: false, message: "Erreur serveur" }, { status: 500 });
  }
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const conversationId = parseInt(searchParams.get("conversationId") || "", 10);
    const beforeId = searchParams.get("beforeId");
    const limit = Math.min(parseInt(searchParams.get("limit") || "30", 10), 50);

    const user = await getUserFromToken();
    if (!user) {
      return NextResponse.json({ success: false, message: "Non autorisé" }, { status: 401 });
    }
    const auteurId = user.id;

    // Récupère TOUS les participants et leur info (header + lastReads d'un coup)
    const allParticipants = await prisma.participant.findMany({
      where: { conversationId },
      select: {
        utilisateurId: true,
        lastReadAt: true,
        utilisateur: { select: { id: true, pseudo: true, photoUrl: true, type: true } },
      },
    });

    const autresParticipants = allParticipants
      .map((p) => p.utilisateurId)
      .filter((id) => id !== auteurId);

    const exclus = await getIdsUtilisateursExclus(auteurId);
    if (autresParticipants.some((id) => exclus.includes(id))) {
      return NextResponse.json({ success: false, message: "Accès refusé à cette conversation." }, { status: 403 });
    }

    // Fetch messages
    const messages = await prisma.message.findMany({
      where: {
        conversationId,
        ...(beforeId && { id: { lt: parseInt(beforeId, 10) } }),
      },
      orderBy: { id: "desc" },
      take: limit,
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
        auteur: { select: { id: true, pseudo: true, photoUrl: true, type: true } },
        envoyeur: true,
        prenomEnvoyeur: true,
        reactions: {
          select: {
            emoji: true,
            utilisateurId: true,
            utilisateur: { select: { pseudo: true } },
          },
        },
      },
    });
    messages.reverse(); // Chronologique

    // Recompose lastReads et participants d'après allParticipants
    const lastReads = allParticipants.map((p) => ({
      utilisateurId: p.utilisateurId,
      lastReadAt: p.lastReadAt,
    }));
    const participants = allParticipants.map((p) => p.utilisateur);

    // Si vraiment besoin du destinataire DM :
    let destinataire = null;
    if (autresParticipants.length === 1) {
      destinataire = participants.find((u) => u.id === autresParticipants[0]);
    }

    return NextResponse.json(
      {
        success: true,
        messages,
        destinataire,
        participants,
        lastReads,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json({ success: false, message: "Impossible de récupérer les messages." }, { status: 500 });
  }
}
