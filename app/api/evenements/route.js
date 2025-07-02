import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "../../../lib/prisma";
import jwt from "jsonwebtoken";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { randomUUID } from "crypto";

// Config AWS S3
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
const BUCKET = process.env.AWS_S3_BUCKET;
const REGION = process.env.AWS_REGION;

const JWT_SECRET = process.env.JWT_SECRET;

// ✅ Récupérer l'utilisateur via le cookie JWT
async function getUserFromCookie() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token || !JWT_SECRET) return null;

  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

// 📥 POST — Créer un événement (PRODUCTION S3)
export async function POST(req) {
  const user = await getUserFromCookie();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès interdit" }, { status: 403 });
  }

  const formData = await req.formData();

  // Champs texte
  const titre = formData.get("titre");
  const description = formData.get("description");
  const date = formData.get("date");
  const lieu = formData.get("lieu");
  const type = formData.get("type");
  const acces = formData.get("acces");
  const latitude = parseFloat(formData.get("latitude")) || null;
  const longitude = parseFloat(formData.get("longitude")) || null;
  const tarifCouple = parseFloat(formData.get("tarifCouple")) || null;
  const tarifFemme = parseFloat(formData.get("tarifFemme")) || null;
  const tarifHomme = parseFloat(formData.get("tarifHomme")) || null;
  const heureDebut = formData.get("heureDebut") || null;
  const heureFin = formData.get("heureFin") || null;
  const lien = formData.get("lien") || null;

  // Champs obligatoires
  if (!titre || !description || !date || !lieu || !type || !acces) {
    return NextResponse.json({ error: "Champs obligatoires manquants" }, { status: 400 });
  }

  // Image upload sur S3 (ou null)
  let imageUrl = null;
  const image = formData.get("image");
  if (image && image.name) {
    if (!image.type.startsWith("image/")) {
      return NextResponse.json({ error: "Format d’image invalide" }, { status: 400 });
    }

    try {
      const buffer = Buffer.from(await image.arrayBuffer());
      // Compression webp
      const webpBuffer = await sharp(buffer)
        .resize(800)
        .webp({ quality: 80 })
        .toBuffer();

      const fileName = `evenements/${randomUUID()}.webp`;

      await s3.send(
        new PutObjectCommand({
          Bucket: BUCKET,
          Key: fileName,
          Body: webpBuffer,
          ContentType: "image/webp",
        })
      );

      imageUrl = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${fileName}`;
    } catch (err) {
      console.error("Erreur upload S3 :", err);
      return NextResponse.json({ error: "Erreur lors du traitement de l’image" }, { status: 500 });
    }
  }

  try {
    await prisma.evenement.create({
      data: {
        titre,
        description,
        date: new Date(date),
        lieu,
        type,
        acces,
        heureDebut,
        heureFin,
        tarifCouple,
        tarifFemme,
        tarifHomme,
        imageUrl,
        latitude,
        longitude,
        lien,
        createur: { connect: { id: user.id } },
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("❌ Erreur création événement :", err);
    return NextResponse.json({ error: "Erreur serveur", details: err.message }, { status: 500 });
  }
}

// 📤 GET — Liste des événements (identique à avant)
export async function GET(req) {
  const { searchParams } = new URL(req.url);

  const page = parseInt(searchParams.get("page") || "1");
  const perPage = 10;
  const skip = (page - 1) * perPage;

  const dateDebut = searchParams.get("dateDebut");
  const dateFin = searchParams.get("dateFin");
  const accesParam = searchParams.get("acces");
  const acces = accesParam ? accesParam.split(",") : [];

  const latitude = parseFloat(searchParams.get("latitude"));
  const longitude = parseFloat(searchParams.get("longitude"));
  const rayon = parseFloat(searchParams.get("rayon")) || 50;

  try {
    let evenements = await prisma.evenement.findMany({
      where: {
        date: {
          gte: dateDebut ? new Date(dateDebut) : undefined,
          lte: dateFin ? new Date(dateFin) : undefined,
        },
        acces: acces.length ? { in: acces } : undefined,
      },
      orderBy: { date: "asc" },
      include: {
        participants: {
          select: { id: true },
        },
      },
    });

    // 🌍 Filtrage géographique
    if (!isNaN(latitude) && !isNaN(longitude)) {
      const toRad = (deg) => (deg * Math.PI) / 180;
      const R = 6371; // Rayon Terre en km

      evenements = evenements.filter((e) => {
        if (e.latitude == null || e.longitude == null) return false;

        const dLat = toRad(e.latitude - latitude);
        const dLon = toRad(e.longitude - longitude);
        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos(toRad(latitude)) *
            Math.cos(toRad(e.latitude)) *
            Math.sin(dLon / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;

        return distance <= rayon;
      });
    }

    const total = evenements.length;
    const paginated = evenements.slice(skip, skip + perPage);

    return NextResponse.json({
      events: paginated,
      total,
      page,
      perPage,
    });
  } catch (err) {
    console.error("❌ Erreur GET /api/evenements :", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
