import { cookies } from "next/headers";
import { prisma } from "../../../../../lib/prisma";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import fs from "fs/promises";
import path from "path";
import sharp from "sharp";

// Clé secrète du JWT
const secret = process.env.JWT_SECRET;

// ✅ GET – Affiche les photos de la galerie privée si l'accès est autorisé
export async function GET(req, context) {
  const galerieId = Number(context.params.id);
  if (!galerieId || isNaN(galerieId)) {
    return NextResponse.json({ error: "ID galerie invalide" }, { status: 400 });
  }

  const cookieStore = cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, secret);
  } catch {
    return NextResponse.json({ error: "Token invalide" }, { status: 403 });
  }

  const galerie = await prisma.galeriePrivee.findUnique({
    where: { id: galerieId },
    include: { photos: true },
  });

  if (!galerie || galerie.utilisateurId !== decoded.id) {
    return NextResponse.json({ error: "Accès interdit" }, { status: 403 });
  }

  return NextResponse.json({ photos: galerie.photos }, { status: 200 });
}

// ✅ POST – Ajoute une photo à la galerie privée
export async function POST(req, context) {
  const galerieId = Number(context.params.id);
  if (!galerieId || isNaN(galerieId)) {
    return NextResponse.json({ error: "ID galerie invalide" }, { status: 400 });
  }

  const cookieStore = cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, secret);
  } catch {
    return NextResponse.json({ error: "Token invalide" }, { status: 403 });
  }

  const utilisateurId = decoded.id;

  const galerie = await prisma.galeriePrivee.findUnique({ where: { id: galerieId } });
  if (!galerie || galerie.utilisateurId !== utilisateurId) {
    return NextResponse.json({ error: "Accès interdit" }, { status: 403 });
  }

  const contentType = req.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json({ error: "Content-Type invalide" }, { status: 415 });
  }

  const formData = await req.formData();
  const file = formData.get("photo");

  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "Fichier invalide" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = `gallery_${utilisateurId}_${Date.now()}.webp`;
  const filepath = path.join(process.cwd(), "public/uploads", filename);

  await fs.mkdir(path.dirname(filepath), { recursive: true });
  await sharp(buffer).resize(600).webp({ quality: 80 }).toFile(filepath);

  const photo = await prisma.photo.create({
    data: {
      url: `/uploads/${filename}`,
      utilisateurId,
      galeriePriveeId: galerieId,
    },
  });

  return NextResponse.json(photo, { status: 201 });
}
