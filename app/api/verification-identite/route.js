// app/api/verification-identite/route.js

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

    // ✅ Bloque uniquement si EN_ATTENTE ou ACCEPTEE
    const existing = await prisma.verificationIdentite.findFirst({
      where: {
        utilisateurId: utilisateur.id,
        statut: { in: ["EN_ATTENTE", "ACCEPTEE"] },
      },
      select: { id: true, statut: true },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, message: "Vous avez déjà une demande en cours ou acceptée." },
        { status: 400 }
      );
    }

    // 2) Lecture du form-data
    const formData = await req.formData();
    const type = formData.get("type") || "SIMPLE";

    const photoCI1 = formData.get("photoCI1");
    const selfie1 = formData.get("selfie1");

    let photoCI2 = null;
    let selfie2 = null;

    if (type === "COUPLE") {
      photoCI2 = formData.get("photoCI2");
      selfie2 = formData.get("selfie2");
    }

    // 3) Vérification fichiers
    const isFile = (f) =>
      f && typeof f !== "string" && typeof f.arrayBuffer === "function";

    const isImage = (f) =>
      isFile(f) && typeof f.type === "string" && f.type.startsWith("image/");
    const isPdf = (f) => isFile(f) && f.type === "application/pdf";

    // ✅ CI: image OU pdf
    const isCIValid = (f) => isImage(f) || isPdf(f);

    // ✅ Selfie: image uniquement
    if (
      !isCIValid(photoCI1) ||
      !isImage(selfie1) ||
      (type === "COUPLE" && (!isCIValid(photoCI2) || !isImage(selfie2)))
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Fichiers invalides. Carte d'identité: image ou PDF. Selfie: image uniquement.",
        },
        { status: 400 }
      );
    }

    // 4) Upload helper
    async function upload(file, prefix) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const name = String(file.name || "file");
      const ext = name.includes(".") ? name.split(".").pop() : null;

      const finalExt =
        ext ||
        (file.type === "application/pdf"
          ? "pdf"
          : file.type?.split("/")?.[1] || "bin");

      const key = `${prefix}/${utilisateur.id}_${Date.now()}_${Math.random()
        .toString(16)
        .slice(2)}.${finalExt}`;

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

    // 5) Analyse adulte (selfie uniquement)
    const analyse1 = await analyzeImageWithSightengineFromFile(selfie1);
    let analyse2 = null;
    if (type === "COUPLE") {
      analyse2 = await analyzeImageWithSightengineFromFile(selfie2);
    }

    if (!analyse1?.isAdult || (type === "COUPLE" && !analyse2?.isAdult)) {
      return NextResponse.json(
        { success: false, message: "Selfie non adulte détecté." },
        { status: 400 }
      );
    }

    // 6) Upload sur S3
    const photoCI1Key = await upload(photoCI1, "verification-ci");
    const selfie1Key = await upload(selfie1, "verification-selfie");
    const photoCI2Key =
      type === "COUPLE" ? await upload(photoCI2, "verification-ci") : null;
    const selfie2Key =
      type === "COUPLE"
        ? await upload(selfie2, "verification-selfie")
        : null;

    // 7) ✅ Upsert (important car utilisateurId est UNIQUE)
    // + reset des infos de refus quand l’utilisateur renvoie
    const demande = await prisma.verificationIdentite.upsert({
      where: { utilisateurId: utilisateur.id },
      update: {
        type,
        photoCI1Url: photoCI1Key,
        selfie1Url: selfie1Key,
        photoCI2Url: photoCI2Key,
        selfie2Url: selfie2Key,
        statut: "EN_ATTENTE",
        commentaire: null,
        documentsRefuses: null, // ✅ reset
      },
      create: {
        utilisateur: { connect: { id: utilisateur.id } },
        type,
        photoCI1Url: photoCI1Key,
        selfie1Url: selfie1Key,
        photoCI2Url: photoCI2Key,
        selfie2Url: selfie2Key,
        statut: "EN_ATTENTE",
      },
    });

    return NextResponse.json({ success: true, demande });
  } catch (err) {
    console.error("Erreur upload/verif identite:", err);
    return NextResponse.json(
      { success: false, message: "Erreur serveur lors de la vérification" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const cookieStore = cookies();
    const utilisateur = await getUserFromToken(cookieStore);
    if (!utilisateur?.id) {
      return NextResponse.json(
        { success: false, message: "Non autorisé" },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }

    const last = await prisma.verificationIdentite.findFirst({
      where: { utilisateurId: utilisateur.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, statut: true, createdAt: true, updatedAt: true },
    });

    const statut = last?.statut || "AUCUNE";
    const verified = ["ACCEPTEE", "VALIDEE", "VERIFIEE"].includes(statut);
    const pending = statut === "EN_ATTENTE";

    return NextResponse.json(
      {
        success: true,
        verified,
        pending,
        statut,
        demandeId: last?.id ?? null,
        updatedAt: last?.updatedAt ?? null,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    console.error("GET /verification-identite/status error:", e);
    return NextResponse.json(
      { success: false, message: "Erreur serveur" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}