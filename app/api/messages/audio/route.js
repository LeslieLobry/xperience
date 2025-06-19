import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getUserFromToken } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { randomUUID } from "crypto";
import { parseBuffer } from "music-metadata";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// 🔁 utilitaire pour formater la durée en mm:ss
function formatDuration(seconds) {
  if (!seconds || isNaN(seconds) || !isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? "0" + s : s}`;
}

export async function POST(req) {
  try {
    const user = await getUserFromToken();
    if (!user || !user.id) {
      console.warn("🚫 Utilisateur non authentifié");
      return NextResponse.json({ success: false, message: "Utilisateur non authentifié" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("audio");
    const conversationId = formData.get("conversationId");
    const dureeClient = formData.get("duree"); // ✅ on récupère la durée envoyée

    if (!file || !conversationId) {
      console.warn("❌ Données manquantes :", { file, conversationId });
      return NextResponse.json({ success: false, message: "Fichier ou conversation manquant" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const extension = file.name?.split(".").pop() || "webm";
    const fileName = `audios/${randomUUID()}.${extension}`;

    console.log("📦 Fichier reçu :", {
      name: file.name,
      type: file.type,
      size: buffer.length + " octets",
    });

    // 🧠 Durée : priorité à celle du client
    let duree = typeof dureeClient === "string" && dureeClient.includes(":") ? dureeClient : "";

    if (!duree) {
      try {
        console.log("🧪 Tentative d'extraction metadata...");
        const metadata = await parseBuffer(buffer, file.type);
        console.log("🎯 Metadata reçue :", metadata);

        if (metadata.format.duration) {
          duree = formatDuration(metadata.format.duration);
          console.log("⏱️ Durée détectée via serveur :", duree);
        } else {
          console.warn("❌ Pas de durée dans metadata");
        }
      } catch (err) {
        console.warn("⚠️ Erreur lors de parseBuffer :", err.message);
      }
    }

    // ⬆️ Upload vers S3
    await s3.send(new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: fileName,
      Body: buffer,
      ContentType: file.type,
    }));

    const audioUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;

    // 💾 Enregistrement en base
    const message = await prisma.message.create({
      data: {
        auteurId: user.id,
        conversationId: parseInt(conversationId),
        type: "AUDIO",
        audioUrl,
        duree,
      },
    });

    console.log("📩 Message enregistré :", message);

    return NextResponse.json({ success: true, message });
  } catch (error) {
    console.error("❌ Erreur upload audio S3 :", error);
    return NextResponse.json({ success: false, message: "Erreur serveur" }, { status: 500 });
  }
}
