import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { getUserFromToken } from "../../../../../lib/auth";
import { cookies } from "next/headers";
import sharp from "sharp";
import { s3 } from "../../../../../lib/s3";
import { PutObjectCommand } from "@aws-sdk/client-s3";

export async function POST(request, context) {
  const { params } = context;
  const cookieStore = cookies();
  const user = await getUserFromToken(cookieStore);

  if (!user?.id) {
    return NextResponse.json(
      { success: false, message: "Non autorisé" },
      { status: 401 }
    );
  }

  const galeriePriveeId = Number.parseInt(params.id, 10);
  if (!galeriePriveeId || Number.isNaN(galeriePriveeId)) {
    return NextResponse.json(
      { success: false, message: "Galerie invalide" },
      { status: 400 }
    );
  }

  // 🔍 On cherche la galerie
  let galerie = await prisma.galeriePrivee.findUnique({
    where: { id: galeriePriveeId },
  });

  // Si elle n'existe pas -> on la crée pour ce user
  if (!galerie) {
    galerie = await prisma.galeriePrivee.create({
      data: {
        utilisateurId: user.id,
        nom: `Galerie de ${user.pseudo || "utilisateur"}`,
      },
    });
  }

  // Sécurité : la galerie doit appartenir au user connecté
  if (galerie.utilisateurId !== user.id) {
    return NextResponse.json(
      {
        success: false,
        message: "Vous n’êtes pas autorisé à modifier cette galerie.",
      },
      { status: 403 }
    );
  }

  const formData = await request.formData();
  const file = formData.get("photo");

  if (!file || typeof file === "string") {
    return NextResponse.json(
      { success: false, message: "Fichier invalide" },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = `gallery_${user.id}_${Date.now()}.webp`;

  const compressedBuffer = await sharp(buffer)
    .resize(600)
    .webp({ quality: 80 })
    .toBuffer();

  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: filename,
        Body: compressedBuffer,
        ContentType: "image/webp",
      })
    );

    const photoUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${filename}`;

    const photo = await prisma.photo.create({
      data: {
        url: photoUrl,
        utilisateurId: user.id,
        galeriePriveeId: galerie.id,
      },
    });

    // ✅ on renvoie à la fois l’objet photo ET photoUrl,
    // pour que PhotoUploader fonctionne sans changement lourd
    return NextResponse.json({
      ...photo,
      photoUrl,
      success: true,
    });
  } catch (error) {
    console.error("Erreur upload galerie privée:", error);
    return NextResponse.json(
      { success: false, message: "Erreur serveur" },
      { status: 500 }
    );
  }
}
