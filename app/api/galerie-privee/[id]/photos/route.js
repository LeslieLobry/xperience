import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { getUserFromToken } from "../../../../../lib/auth";
import { cookies } from "next/headers";
import path from "path";
import fs from "fs/promises";
import sharp from "sharp";

export async function POST(request, context) {
  const { params } = context;
  const cookieStore = cookies();
  const user = await getUserFromToken(cookieStore);

  if (!user?.id) {
    return NextResponse.json({ success: false, message: "Non autorisé" }, { status: 401 });
  }

  const galeriePriveeId = parseInt(params.id, 10);
  if (!galeriePriveeId) {
    return NextResponse.json({ success: false, message: "Galerie invalide" }, { status: 400 });
  }

  // 🔍 Vérifie si la galerie existe déjà
  let galerie = await prisma.galeriePrivee.findUnique({
    where: { id: galeriePriveeId },
  });

  // ✅ Si la galerie n'existe pas encore → on la crée
  if (!galerie) {
    galerie = await prisma.galeriePrivee.create({
      data: {
        utilisateurId: user.id,
        nom: `Galerie de ${user.pseudo || "utilisateur"}`,
      },
    });
  }

  // ⚠️ Sécurité : empêcher un utilisateur d'ajouter une photo dans une galerie qui n'est pas la sienne
  if (galerie.utilisateurId !== user.id) {
    return NextResponse.json({
      success: false,
      message: "Vous n’êtes pas autorisé à modifier cette galerie.",
    }, { status: 403 });
  }

  // ✅ Traitement du fichier
  const formData = await request.formData();
  const file = formData.get("photo");

  if (!file || typeof file === "string") {
    return NextResponse.json({ success: false, message: "Fichier invalide" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const filename = `gallery_${user.id}_${Date.now()}.webp`;
  const filepath = path.join(process.cwd(), "public/uploads", filename);

  await fs.mkdir(path.dirname(filepath), { recursive: true });
  await sharp(buffer).resize(600).webp({ quality: 80 }).toFile(filepath);

  const photoUrl = `/uploads/${filename}`;

  try {
    const photo = await prisma.photo.create({
      data: {
        url: photoUrl,
        utilisateurId: user.id,
        galeriePriveeId: galerie.id,
      },
    });

    return NextResponse.json(photo);
  } catch (error) {
    console.error("Erreur création photo:", error);
    return NextResponse.json({ success: false, message: "Erreur serveur" }, { status: 500 });
  }
}
