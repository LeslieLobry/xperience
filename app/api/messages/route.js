import { prisma } from "../../../lib/prisma";
import { getIdsUtilisateursExclus } from "../../../lib/utilsFiltrage";
import { getUserFromToken } from "../../../lib/auth";
import { v4 as uuidv4 } from "uuid";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import Ably from "ably";
import { sendPush } from "../../../lib/push"; // 🔔 NEW: helper push

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

// Petit helper pour le texte de la push
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
  console.log("⇒ POST /api/messages déclenché");
  console.log("POST /api/messages CONTENT-TYPE:", req.headers.get("content-type"));
  let debugBody = "";
  try {
    debugBody = await req.clone().text();
  } catch {}

  if (debugBody) {
    console.log("[LOG][POST /api/messages] raw body (truncated 800):", debugBody.slice(0, 800));
  }

  try {
    const contentType = req.headers.get("content-type") || "";
    let body = {};
    let file = null;

    if (contentType.includes("application/json")) {
      body = await req.json();
      console.log("[LOG][POST] body(JSON):", {
        conversationId: body?.conversationId,
        type: body?.type,
        hasContenu: !!body?.contenu,
        imageUrl: body?.imageUrl,
        audioUrl: body?.audioUrl,
      });
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

      // Sélection du fichier selon le type
      if ((body.type === "IMAGE" || body.type === "EPHEMERE") && formData.get("image")) {
        file = formData.get("image");
      } else if ((body.type === "AUDIO" || body.type === "EPHEMERE") && formData.get("audio")) {
        file = formData.get("audio");
      }

      console.log("[LOG][POST] body(form-data):", {
        conversationId: body.conversationId,
        type: body.type,
        hasContenu: !!body.contenu,
        hasFile: !!file,
        fileName: file?.name,
        fileType: file?.type,
        fileSize: file?.size,
      });
    } else {
      console.warn("[LOG][POST] Type non supporté:", contentType);
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

      console.log("[LOG][POST] prêt upload S3:", {
        bucket: BUCKET,
        key: fileName,
        contentType: file.type,
        size: buffer.length,
      });

      // Détection mineur (Sightengine) si IMAGE/EPHEMERE
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
              console.warn("[LOG][POST] Image rejetée (mineur détecté)");
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

      // Stocke la clé S3
      if (file.type.startsWith("audio/")) {
        body.audioUrl = fileName;
      } else {
        body.imageUrl = fileName;
      }

      console.log("[LOG][POST] upload S3 OK, champs mis à jour:", {
        imageUrl: body.imageUrl,
        audioUrl: body.audioUrl,
      });
    } else {
      console.log("[LOG][POST] aucun fichier à uploader ou size=0");
    }

    const { conversationId, contenu, imageUrl, audioUrl, videoUrl, type, envoyeur } = body;
    const user = await getUserFromToken();
    if (!user) {
      console.warn("[LOG][POST] getUserFromToken => null");
      return NextResponse.json({ success: false, message: "Non autorisé" }, { status: 401 });
    }

    const auteurId = user.id;
    console.log("[LOG][POST] auteurId:", auteurId, "conversationId:", conversationId, "type:", type, "imageUrl:", imageUrl, "audioUrl:", audioUrl);

    // Participants (ids)
    const participants = await prisma.participant.findMany({
      where: { conversationId },
      select: { utilisateurId: true },
    });
    console.log("[LOG][POST] participants:", participants?.map(p => p.utilisateurId));

    const autresParticipants = (participants || [])
      .map((p) => p.utilisateurId)
      .filter((id) => id !== auteurId);

    // Vérifie si certains participants sont bloqués
    const exclus = await getIdsUtilisateursExclus(auteurId);
    if (autresParticipants.some((id) => exclus.includes(id))) {
      console.warn("[LOG][POST] utilisateur bloqué détecté");
      return NextResponse.json({ success: false, message: "Utilisateur bloqué" }, { status: 403 });
    }

    let prenomEnvoyeur = body.prenomEnvoyeur || null;

    console.log("[LOG][POST] création message…");
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
    console.log("[LOG][POST] message créé:", {
      id: message.id,
      type: message.type,
      imageUrl: message.imageUrl,
      audioUrl: message.audioUrl,
      createdAt: message.createdAt,
    });

    // PATCH: optimisticKey pour le front
    const optimisticKey = body.optimisticKey || null;
    const messageWithOptimisticKey = { ...message, optimisticKey };

    // Publish Ably
    console.log("[LOG][POST] publish Ably payload (avant):", {
      id: messageWithOptimisticKey.id,
      type: messageWithOptimisticKey.type,
      imageUrl: messageWithOptimisticKey.imageUrl,
      audioUrl: messageWithOptimisticKey.audioUrl,
      optimisticKey,
    });
    await ably.channels.get(`conversation-${conversationId}`).publish("message", messageWithOptimisticKey);
    console.log("[LOG][POST] publish Ably: OK");

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    // Notifications internes (DB)
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
    console.log("[LOG][POST] notifications enregistrées pour:", autresParticipants);

    // DIGEST QUOTIDIEN : on empile pour envoi plus tard
    if (autresParticipants.length > 0) {
      await prisma.digestNotification.createMany({
        data: autresParticipants.map((destId) => ({
          destinataireId: destId,
          conversationId,
          messageId: message.id,
        })),
        skipDuplicates: true,
      });
      console.log("[LOG][POST] digestNotification createMany OK (count≈):", autresParticipants.length);
    }

    // 🔔 PUSH EXPO : envoi aux autres participants de la conv
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
          console.log("[LOG][POST] push envoyées:", tokens.length);
        } catch (e) {
          console.warn("[LOG][POST] échec envoi push:", e?.message || e);
        }
      } else {
        console.log("[LOG][POST] aucun token Expo à notifier");
      }
    }

    // ✅ Réponse API avec optimisticKey
    console.log("[LOG][POST] réponse API:", {
      id: messageWithOptimisticKey.id,
      type: messageWithOptimisticKey.type,
      imageUrl: messageWithOptimisticKey.imageUrl,
      audioUrl: messageWithOptimisticKey.audioUrl,
      optimisticKey,
    });
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

    console.log("[LOG][GET] params:", { conversationId, beforeId, limit });

    const user = await getUserFromToken();
    if (!user) {
      console.warn("[LOG][GET] getUserFromToken => null");
      return NextResponse.json({ success: false, message: "Non autorisé" }, { status: 401 });
    }
    const auteurId = user.id;

    const allParticipants = await prisma.participant.findMany({
      where: { conversationId },
      select: {
        utilisateurId: true,
        lastReadAt: true,
        utilisateur: { select: { id: true, pseudo: true, photoUrl: true, type: true } },
      },
    });

    console.log("[LOG][GET] participants:", allParticipants.map(p => ({
      utilisateurId: p.utilisateurId, lastReadAt: p.lastReadAt
    })));

    const autresParticipants = allParticipants
      .map((p) => p.utilisateurId)
      .filter((id) => id !== auteurId);

    const exclus = await getIdsUtilisateursExclus(auteurId);
    if (autresParticipants.some((id) => exclus.includes(id))) {
      console.warn("[LOG][GET] accès refusé (utilisateur bloqué)");
      return NextResponse.json({ success: false, message: "Accès refusé à cette conversation." }, { status: 403 });
    }

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

    console.log("[LOG][GET] messages count:", messages.length);
    console.log("[LOG][GET] tail sample:", messages.slice(-3).map(m => ({
      id: m.id, type: m.type, imageUrl: m.imageUrl, audioUrl: m.audioUrl, createdAt: m.createdAt
    })));

    const lastReads = allParticipants.map((p) => ({
      utilisateurId: p.utilisateurId,
      lastReadAt: p.lastReadAt,
    }));
    const participantsInfos = allParticipants.map((p) => p.utilisateur);

    let destinataire = null;
    if (participantsInfos.length === 2) {
      destinataire = participantsInfos.find((u) => u.id !== auteurId) || null;
    }

    return NextResponse.json(
      {
        success: true,
        messages,
        destinataire,
        participants: participantsInfos,
        lastReads,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[LOG][GET] erreur:", error);
    return NextResponse.json({ success: false, message: "Impossible de récupérer les messages." }, { status: 500 });
  }
}
