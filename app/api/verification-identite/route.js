// app/api/verification-identite/route.js
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "20mb",
    },
  },
};

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUserFromToken } from "../../../lib/auth";
import { s3 } from "../../../lib/s3";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { analyzeImageWithSightengineFromFile } from "../../../lib/sightengine";
import { prisma } from "../../../lib/prisma";

export async function POST(req) {
  try {
    // 1) Auth
    const cookieStore = cookies();
    const utilisateur = await getUserFromToken(cookieStore);
    if (!utilisateur?.id) {
      return NextResponse.json(
        { success: false, message: "Non autorisé" },
        { status: 401 }
      );
    }

    // 2) Lecture du form-data
    const formData = await req.formData();
    const type     = formData.get("type") || "SIMPLE";
    const photoCI1 = formData.get("photoCI1");
    const selfie1  = formData.get("selfie1");
    let photoCI2, selfie2;
    if (type === "COUPLE") {
      photoCI2 = formData.get("photoCI2");
      selfie2  = formData.get("selfie2");
    }

    // 3) Vérification basique des fichiers
    const isImage = file =>
      file && typeof file !== "string" && file.type.startsWith("image/");
    if (
      !isImage(photoCI1) ||
      !isImage(selfie1) ||
      (type === "COUPLE" && (!isImage(photoCI2) || !isImage(selfie2)))
    ) {
      return NextResponse.json(
        { success: false, message: "Fichiers invalides ou non images." },
        { status: 400 }
      );
    }

    // 4) Upload helper
    async function upload(file, prefix) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const ext    = file.name.split(".").pop();
      const key    = `${prefix}/${utilisateur.id}_${Date.now()}.${ext}`;
      await s3.send(
        new PutObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET,
          Key: key,
          Body: buffer,
          ContentType: file.type,
        })
      );
      return key;
    }

    // 5) Analyse adulte
    const analyse1 = await analyzeImageWithSightengineFromFile(selfie1);
    let analyse2 = null;
    if (type === "COUPLE") {
      analyse2 = await analyzeImageWithSightengineFromFile(selfie2);
    }

    if (!analyse1.isAdult || (type === "COUPLE" && !analyse2?.isAdult)) {
      return NextResponse.json(
        { success: false, message: "Selfie non adulte détecté." },
        { status: 400 }
      );
    }

    // 6) Upload sur S3
    const photoCI1Key = await upload(photoCI1, "verification-ci");
    const selfie1Key  = await upload(selfie1,  "verification-selfie");
    const photoCI2Key = type === "COUPLE" ? await upload(photoCI2, "verification-ci")        : null;
    const selfie2Key  = type === "COUPLE" ? await upload(selfie2,  "verification-selfie")     : null;

    // 7) Enregistrement en base Prisma
    const demande = await prisma.verificationIdentite.create({
      data: {
        utilisateur:  { connect: { id: utilisateur.id } },
        type,
        photoCI1Url:  photoCI1Key,
        selfie1Url:   selfie1Key,
        photoCI2Url:  photoCI2Key,
        selfie2Url:   selfie2Key,
        statut:       "EN_ATTENTE",
      },
    });

    return NextResponse.json({
      success: true,
      demande,
    });
  } catch (err) {
    console.error("Erreur upload/verif identite:", err);
    return NextResponse.json(
      { success: false, message: "Erreur serveur lors de la vérification" },
      { status: 500 }
    );
  }
}
