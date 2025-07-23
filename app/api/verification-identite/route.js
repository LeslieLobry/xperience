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
    const cookieStore = cookies();
    const utilisateur = await getUserFromToken(cookieStore);
    console.log("Utilisateur récupéré :", utilisateur?.id ?? "null");

    if (!utilisateur || !utilisateur.id) {
      console.log("Erreur : utilisateur non authentifié");
      return NextResponse.json(
        { success: false, message: "Non autorisé" },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const type = formData.get("type") || "SIMPLE";
    console.log("Type de vérification :", type);

    const photoCI1 = formData.get("photoCI1");
    const selfie1 = formData.get("selfie1");
    let photoCI2, selfie2;

    if (type === "COUPLE") {
      photoCI2 = formData.get("photoCI2");
      selfie2 = formData.get("selfie2");
    }

    console.log("photoCI1:", photoCI1?.name ?? "absent");
    console.log("selfie1:", selfie1?.name ?? "absent");
    if (type === "COUPLE") {
      console.log("photoCI2:", photoCI2?.name ?? "absent");
      console.log("selfie2:", selfie2?.name ?? "absent");
    }

    function isValidImage(file) {
      return file && typeof file !== "string" && file.type.startsWith("image/");
    }

    if (
      !isValidImage(photoCI1) ||
      !isValidImage(selfie1) ||
      (type === "COUPLE" && (!isValidImage(photoCI2) || !isValidImage(selfie2)))
    ) {
      console.log("Erreur : fichiers invalides ou non images");
      return NextResponse.json(
        { success: false, message: "Fichiers invalides ou non images." },
        { status: 400 }
      );
    }

    async function upload(file, prefix) {
      const arrayBuffer = await file.arrayBuffer();
      const ext = file.name.split(".").pop();
      const key = `${prefix}/${utilisateur.id}_${Date.now()}.${ext}`;
      console.log(`Upload vers S3 : ${key}`);

      await s3.send(
        new PutObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET,
          Key: key,
          Body: Buffer.from(arrayBuffer),
          ContentType: file.type,
        })
      );

      // retourne uniquement la clé (pas l'URL complète)
      return key;
    }

    console.log("Analyse selfie 1 en cours...");
    const analyseSelfie1 = await analyzeImageWithSightengineFromFile(selfie1);
    let analyseSelfie2 = null;
    if (type === "COUPLE") {
      console.log("Analyse selfie 2 en cours...");
      analyseSelfie2 = await analyzeImageWithSightengineFromFile(selfie2);
      console.log("Données brutes analyse selfie 2 :", JSON.stringify(analyseSelfie2?.raw, null, 2));
      console.log("Âge estimé selfie 2 :", analyseSelfie2?.age);
    }

    let refuseReason = null;
    if (!analyseSelfie1.isAdult) refuseReason = "1er selfie non adulte.";
    if (type === "COUPLE" && !analyseSelfie2?.isAdult)
      refuseReason = "2e selfie non adulte.";

    const expectedSexe =
      utilisateur.type === "homme"
        ? "male"
        : utilisateur.type === "femme"
        ? "female"
        : null;

    if (expectedSexe && analyseSelfie1.gender !== expectedSexe)
      refuseReason = "Genre selfie 1 non conforme.";

    if (
      type === "COUPLE" &&
      expectedSexe &&
      analyseSelfie2?.gender !== expectedSexe
    )
      refuseReason = "Genre selfie 2 non conforme.";

    if (refuseReason) {
      console.log("Refus automatique:", refuseReason);
      return NextResponse.json(
        { success: false, message: refuseReason },
        { status: 400 }
      );
    }

    const photoCI1Key = await upload(photoCI1, "verification-ci");
    const selfie1Key = await upload(selfie1, "verification-selfie");
    let photoCI2Key = null;
    let selfie2Key = null;

    if (type === "COUPLE") {
      photoCI2Key = await upload(photoCI2, "verification-ci");
      selfie2Key = await upload(selfie2, "verification-selfie");
    }

    console.log("Enregistrement en base Prisma...");
    const demande = await prisma.verificationIdentite.create({
      data: {
        utilisateur: { connect: { id: utilisateur.id } },
        type,
        photoCI1Url: photoCI1Key,
        selfie1Url: selfie1Key,
        photoCI2Url: photoCI2Key,
        selfie2Url: selfie2Key,
        statut: "EN_ATTENTE",
      },
    });

    console.log("Demande créée, id:", demande.id);

    return NextResponse.json({
      success: true,
      statut: "EN_ATTENTE",
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
