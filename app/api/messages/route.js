import { prisma } from "../../../lib/prisma";
import { getIdsUtilisateursExclus } from "../../../lib/utilsFiltrage";
import { getUserFromToken } from "../../../lib/auth";
import { resend } from "../../../lib/resend";
import { v4 as uuidv4 } from "uuid";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { Realtime } from "ably";

// Config S3
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
const BUCKET = process.env.AWS_S3_BUCKET;
const ably = new Realtime(process.env.NEXT_PUBLIC_ABLY_API_KEY);


export async function POST(req) {
  console.log("⇒ POST /api/messages déclenché");
  console.log("POST /api/messages CONTENT-TYPE:", req.headers.get("content-type"));
  let debugBody = "";
  try { debugBody = await req.clone().text(); } catch {}
  console.log("POST /api/messages RAW BODY:", debugBody);

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
      };

      // Sélectionne le fichier selon le type et présence dans formData
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

      await s3.send(
        new PutObjectCommand({
          Bucket: BUCKET,
          Key: fileName,
          Body: buffer,
          ContentType: file.type,
        })
      );

      // Détermine le bon champ URL selon MIME type même en mode EPHEMERE
      if (file.type.startsWith("audio/")) {
        body.audioUrl = `https://${BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
      } else {
        body.imageUrl = `https://${BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
      }
      console.log("URL construite :", body.imageUrl || body.audioUrl);
    }

    const { conversationId, contenu, imageUrl, audioUrl, videoUrl, type, envoyeur } = body;
    const user = await getUserFromToken();
    if (!user)
      return NextResponse.json({ success: false, message: "Non autorisé" }, { status: 401 });

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
        duree: null,
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
await ably.channels.get(`conversation-${conversationId}`).publish("message", message);
    console.log("Message créé en base :", message);

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

    // Envoi email si destinataire hors ligne
    (async () => {
      try {
        const participantsWithUser = await prisma.participant.findMany({
          where: { conversationId },
          include: { utilisateur: true },
        });
        const destinataire = participantsWithUser
          .map((p) => p.utilisateur)
          .find((u) => u.id !== auteurId);

        if (!destinataire || destinataire.statut === "en_ligne" || !destinataire.email) return;

        const extrait = (contenu || "")
          .substring(0, 100)
          .replace(/\n/g, "<br>")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");

        await resend.emails.send({
          from: `"Xperiences" <${process.env.EMAIL_FROM}>`,
          to: destinataire.email,
          subject: `[Xperiences] Nouveau message de ${message.auteur.pseudo}`,
          html: `
            <p>Bonjour ${destinataire.pseudo},</p>
            <p>Vous avez reçu un nouveau message :</p>
            <blockquote>${extrait}…</blockquote>
            <p><a href="${process.env.NEXT_PUBLIC_URL}/messagerie?conversationId=${conversationId}">Voir le message</a></p>
          `,
        });
      } catch (err) {
        console.error("Erreur lors de l'envoi du mail :", err);
      }
    })();

    return NextResponse.json({ success: true, message }, { status: 200 });
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

    // Vérification d’accès
    const participantsMeta = await prisma.participant.findMany({
      where: { conversationId },
      select: { utilisateurId: true, lastReadAt: true },
    });
    const autresParticipants = participantsMeta.map((p) => p.utilisateurId).filter((id) => id !== auteurId);
    const exclus = await getIdsUtilisateursExclus(auteurId);
    if (autresParticipants.some((id) => exclus.includes(id))) {
      return NextResponse.json({ success: false, message: "Accès refusé à cette conversation." }, { status: 403 });
    }

    // Fetch messages optimisé
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
    console.log("Messages envoyés au frontend:", messages.map((m) => ({ id: m.id, imageUrl: m.imageUrl })));

    // Destinataire (si besoin)
    const destinataire = autresParticipants.length === 1
      ? await prisma.utilisateur.findUnique({
          where: { id: autresParticipants[0] },
          select: { id: true, pseudo: true, photoUrl: true },
        })
      : null;

    // Retourne lastReads
    const lastReads = participantsMeta.map((p) => ({
      utilisateurId: p.utilisateurId,
      lastReadAt: p.lastReadAt,
    }));

    // Ajoute TOUS les participants (avec leurs infos, pour affichage header)
    const allParticipants = await prisma.participant.findMany({
      where: { conversationId },
      select: {
        utilisateur: {
          select: { id: true, pseudo: true, photoUrl: true, type: true }
        }
      }
    });
    const participants = allParticipants.map((p) => p.utilisateur); // Voilà le header propre

    return NextResponse.json(
      {
        success: true,
        messages,
        destinataire,
        participants, // Pour le header
        lastReads,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Erreur dans GET /api/messages :", error);
    return NextResponse.json({ success: false, message: "Impossible de récupérer les messages." }, { status: 500 });
  }
}


