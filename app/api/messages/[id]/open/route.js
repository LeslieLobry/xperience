import { prisma } from "../../../../../lib/prisma";
import { getUserFromToken } from "../../../../../lib/auth";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
const BUCKET = process.env.AWS_S3_BUCKET;

export async function PATCH(req, context) {
  const { params } = context;
  const { id } = params;
  try {
    const user = await getUserFromToken();
    if (!user)
      return NextResponse.json({ success: false, message: "Non autorisé" }, { status: 401 });

    // Récupère le message avec les champs nécessaires
    const message = await prisma.message.findUnique({
      where: { id: parseInt(id, 10) },
      select: {
        id: true,
        type: true,
        conversationId: true,
        imageUrl: true,
        auteurId: true,
      },
    });

    if (!message || message.type !== "EPHEMERE") {
      return NextResponse.json(
        { success: false, message: "Message introuvable ou pas éphémère" },
        { status: 404 }
      );
    }

    // Vérifie que user est participant à la conversation
    const participants = await prisma.participant.findMany({
      where: { conversationId: message.conversationId },
      select: { utilisateurId: true },
    });
    if (!participants.some((p) => p.utilisateurId === user.id)) {
      return NextResponse.json({ success: false, message: "Accès refusé" }, { status: 403 });
    }

    // Si c’est l’envoyeur qui ouvre, on ne supprime pas, juste OK
    if (user.id === message.auteurId) {
      return NextResponse.json({ success: true, message: "Envoyeur a ouvert, pas de suppression" }, { status: 200 });
    }

    // Si le destinataire ouvre, suppression immédiate

    // Supprime la photo sur S3 si imageUrl présente
    if (message.imageUrl) {
      const key = message.imageUrl.split(".amazonaws.com/")[1];
      if (key) {
        await s3.send(
          new DeleteObjectCommand({
            Bucket: BUCKET,
            Key: key,
          })
        );
      }
    }

    // Supprime le message en base
    await prisma.message.delete({ where: { id: message.id } });

    return NextResponse.json({ success: true, message: "Message supprimé à l'ouverture du destinataire" }, { status: 200 });
  } catch (err) {
    console.error("Erreur PATCH /api/messages/[id]/open :", err);
    return NextResponse.json({ success: false, message: "Erreur serveur" }, { status: 500 });
  }
}
