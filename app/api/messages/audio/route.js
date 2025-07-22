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
  if (
    !seconds ||
    isNaN(seconds) ||
    !isFinite(seconds) ||
    seconds < 0 ||
    typeof seconds !== "number"
  )
    return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? "0" + s : s}`;
}

export async function POST(req) {
  try {
    // --- Auth
    const user = await getUserFromToken();
    if (!user || !user.id) {
      return NextResponse.json(
        { success: false, message: "Utilisateur non authentifié" },
        { status: 401 }
      );
    }

    // --- Récup formData
    const formData = await req.formData();
    console.log("===== FORM DATA RECUE =====");
    for (let entry of formData.entries()) {
      console.log(entry[0], entry[1]);
    }
    console.log("===========================");

    const file = formData.get("audio");
    const conversationId = formData.get("conversationId");
    let dureeClient = formData.get("duree");

    console.log("Durée reçue du client:", dureeClient);

    if (!file || !conversationId) {
      return NextResponse.json(
        { success: false, message: "Fichier ou conversation manquant" },
        { status: 400 }
      );
    }

    // --- Buffer et extension
    const buffer = Buffer.from(await file.arrayBuffer());
    const extension = file.name?.split(".").pop() || "webm";
    const fileName = `audios/${randomUUID()}.${extension}`;

    // 1️⃣ Correction sécurité sur la durée reçue du client
  let duree = "";
if (
  typeof dureeClient === "string" &&
  /^(\d{1,3}):(\d{1,2})$/.test(dureeClient) &&
  !dureeClient.includes("NaN") &&
  !dureeClient.includes("Infinity")
) {
  const parts = dureeClient.match(/^(\d{1,3}):(\d{1,2})$/);
  let minutes = parts[1];
  let secondes = parts[2].padStart(2, "0"); // ex: "5" => "05"
  duree = `${minutes}:${secondes}`;
}

    // 2️⃣ Si pas valide, tente d'extraire la durée serveur
    if (!duree) {
      try {
        const metadata = await parseBuffer(buffer, file.type);
        if (metadata?.format?.duration) {
          duree = formatDuration(metadata.format.duration);
        }
      } catch (err) {
        console.warn("Erreur extraction durée metadata:", err);
      }
    }

    // 3️⃣ Double sécurité : si toujours rien ou foireux, force à 0:00
    if (
      !duree ||
      duree.includes("NaN") ||
      duree.includes("Infinity") ||
      !/^\d{1,3}:\d{2}$/.test(duree)
    ) {
      duree = "0:00";
    }

    console.log("Durée finale enregistrée:", duree);

    // ⬆️ Upload S3
    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: fileName,
        Body: buffer,
        ContentType: file.type,
      })
    );
   const audioUrl = fileName; // 👈 Clé S3 seule, compatible avec presign !


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

    return NextResponse.json({ success: true, message });
  } catch (error) {
    console.error("Erreur dans POST /api/messages/audio :", error);
    return NextResponse.json(
      { success: false, message: "Erreur serveur" },
      { status: 500 }
    );
  }
}
