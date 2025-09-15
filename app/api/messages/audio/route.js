// app/api/messages/audio/route.js
import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getUserFromToken } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { randomUUID } from "crypto";
import { parseBuffer } from "music-metadata";

import ffmpegPath from "ffmpeg-static";
import { spawn } from "child_process";
import { writeFile, readFile } from "fs/promises";
import path from "path";

// 👉 important: route en Node (pas Edge)
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// 🔁 utilitaire pour formater la durée en mm:ss
function formatDuration(seconds) {
  if (!seconds || isNaN(seconds) || !isFinite(seconds) || seconds < 0 || typeof seconds !== "number")
    return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? "0" + s : s}`;
}

// 🔁 transcode webm/opus -> m4a/aac (retourne un Buffer)
async function transcodeWebmToM4a(inputBuf) {
  const inPath = path.join("/tmp", `in-${randomUUID()}.webm`);
  const outPath = path.join("/tmp", `out-${randomUUID()}.m4a`);
  await writeFile(inPath, inputBuf);

  await new Promise((resolve, reject) => {
    const args = [
      "-y",
      "-i", inPath,
      "-c:a", "aac",
      "-b:a", "128k",
      "-movflags", "+faststart",
      outPath,
    ];
    const child = spawn(ffmpegPath, args, { stdio: "ignore" });
    child.on("error", reject);
    child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exit ${code}`))));
  });

  const out = await readFile(outPath);
  return out;
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

    // --- FormData
    const formData = await req.formData();
    const file = formData.get("audio");
    const conversationId = formData.get("conversationId");
    let dureeClient = formData.get("duree");

    if (!file || !conversationId) {
      return NextResponse.json(
        { success: false, message: "Fichier ou conversation manquant" },
        { status: 400 }
      );
    }

    // --- Buffer / noms
    const buffer = Buffer.from(await file.arrayBuffer());
    const originalExt = (file.name?.split(".").pop() || "webm").toLowerCase();
    const baseName = `audios/${randomUUID()}`;
    const originalKey = `${baseName}.${originalExt}`;
    const m4aKey = `${baseName}.m4a`;

    // 1️⃣ Durée (sécurise la valeur client)
    let duree = "";
    if (
      typeof dureeClient === "string" &&
      /^(\d{1,3}):(\d{1,2})$/.test(dureeClient) &&
      !dureeClient.includes("NaN") &&
      !dureeClient.includes("Infinity")
    ) {
      const parts = dureeClient.match(/^(\d{1,3}):(\d{1,2})$/);
      let minutes = parts[1];
      let secondes = parts[2].padStart(2, "0");
      duree = `${minutes}:${secondes}`;
    }

    // 2️⃣ Si pas valide, essaie d’extraire côté serveur
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

    // 3️⃣ Filet de sécurité
    if (!duree || duree.includes("NaN") || duree.includes("Infinity") || !/^\d{1,3}:\d{2}$/.test(duree)) {
      duree = "0:00";
    }

    // ⬆️ Upload de l’original (inchangé)
    await s3.send(new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: originalKey,
      Body: buffer,
      ContentType: file.type || "application/octet-stream",
    }));

    // ➕ Variante mobile .m4a si original est webm/ogg/opus
    const mime = (file.type || "").toLowerCase();
    const looksWebm =
      mime.includes("webm") || mime.includes("ogg") || mime.includes("opus") ||
      ["webm", "ogg", "opus"].includes(originalExt);

    if (looksWebm) {
      try {
        const m4aBuf = await transcodeWebmToM4a(buffer);
        await s3.send(new PutObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET,
          Key: m4aKey,
          Body: m4aBuf,
          ContentType: "audio/m4a", // ou "audio/mp4"
        }));
      } catch (e) {
        console.warn("Transcodage m4a échoué:", e);
        // Non bloquant: le web lit l’original; l'app affichera "format non disponible" si pas de .m4a
      }
    }

    // 💾 DB: on garde la clé originale (le front web ne change pas)
    const message = await prisma.message.create({
      data: {
        auteurId: user.id,
        conversationId: parseInt(conversationId),
        type: "AUDIO",
        audioUrl: originalKey,
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
