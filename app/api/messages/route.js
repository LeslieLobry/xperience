import { prisma } from "../../../lib/prisma";
import { getIdsUtilisateursExclus } from "../../../lib/utilsFiltrage";
import { getUserFromToken } from "../../../lib/auth";
import { cookies } from "next/headers";
import { resend } from "../../../lib/resend";
import { v4 as uuidv4 } from "uuid";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";

// Config S3
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
const BUCKET = process.env.AWS_S3_BUCKET_NAME;

export async function POST(req) {
  console.log("⇒ POST /api/messages déclenché");

  try {
    const contentType = req.headers.get("content-type");
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
        videoUrl: null,
      };
      file = formData.get("image");
    } else {
      return NextResponse.json({ error: "Type non supporté" }, { status: 400 });
    }

    // Upload image sur S3 si fichier fourni
    if (file && file.size > 0) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const ext = file.name.split(".").pop();
      const fileName = `msg_${uuidv4()}.${ext}`;
      await s3.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: fileName,
        Body: buffer,
        ContentType: file.type,
        ACL: "public-read",
      }));
      body.imageUrl = `https://${BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
    }

    const { conversationId, contenu, imageUrl, videoUrl, type } = body;

    const user = await getUserFromToken(cookies());
    if (!user) {
      return NextResponse.json({ success: false, message: "Non autorisé" }, { status: 401 });
    }

    const auteurId = user.id;

    const participants = await prisma.participant.findMany({
      where: { conversationId },
      select: { utilisateurId: true },
    });

    const autresParticipants = participants
      .map(p => p.utilisateurId)
      .filter(id => id !== auteurId);

    const exclus = await getIdsUtilisateursExclus(auteurId);
    if (autresParticipants.some(id => exclus.includes(id))) {
      return NextResponse.json({ success: false, message: "Utilisateur bloqué" }, { status: 403 });
    }

    const message = await prisma.message.create({
      data: {
        conversationId,
        auteurId,
        contenu,
        imageUrl,
        videoUrl,
        type,
        lu: false,
      },
      include: { auteur: true },
    });

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    await Promise.all(
      autresParticipants.map(destId =>
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

    // Envoi d'e-mail si destinataire hors ligne
    (async () => {
      try {
        const participantsWithUser = await prisma.participant.findMany({
          where: { conversationId },
          include: { utilisateur: true },
        });
        const destinataire = participantsWithUser
          .map(p => p.utilisateur)
          .find(u => u.id !== auteurId);
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
  console.log("⇒ GET /api/messages déclenché");

  try {
    const { searchParams } = new URL(req.url);
    const conversationId = parseInt(searchParams.get("conversationId"), 10);

    const cookieStore = cookies();
    const user = await getUserFromToken(cookieStore);
    if (!user) {
      return Response.json({ success: false, message: "Non autorisé" }, { status: 401 });
    }

    const auteurId = user.id;

    // Vérifie blocage
    const participants = await prisma.participant.findMany({
      where: { conversationId },
      select: { utilisateurId: true },
    });

    const autresParticipants = participants
      .map((p) => p.utilisateurId)
      .filter((id) => id !== auteurId);

    const exclus = await getIdsUtilisateursExclus(auteurId);
    const estBloque = autresParticipants.some((id) => exclus.includes(id));
    if (estBloque) {
      return Response.json(
        { success: false, message: "Accès refusé à cette conversation." },
        { status: 403 }
      );
    }

    const messages = await prisma.message.findMany({
      where: { conversationId },
      include: { auteur: true },
      orderBy: { createdAt: "asc" },
    });

    return Response.json({ success: true, messages }, { status: 200 });
  } catch (error) {
    console.error("Erreur dans GET /api/messages :", error);
    return Response.json(
      { success: false, message: "Impossible de récupérer les messages." },
      { status: 500 }
    );
  }
}
