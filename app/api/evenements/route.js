import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "../../../lib/prisma";
import jwt from "jsonwebtoken";
import path from "path";
import fs from "fs/promises";
import sharp from "sharp";

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

// 📥 POST — Créer un événement
export async function POST(req) {
  const user = await getUserFromCookie();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès interdit" }, { status: 403 });
  }

  const formData = await req.formData();

  const titre = formData.get("titre");
  const description = formData.get("description");
  const date = formData.get("date");
  const lieu = formData.get("lieu");
  const type = formData.get("type");
  const acces = formData.get("acces");
  const image = formData.get("image");
  const latitude = parseFloat(formData.get("latitude")) || null;
  const longitude = parseFloat(formData.get("longitude")) || null;
  const tarifCouple = parseFloat(formData.get("tarifCouple")) || null;
  const tarifFemme = parseFloat(formData.get("tarifFemme")) || null;
  const tarifHomme = parseFloat(formData.get("tarifHomme")) || null;
  const heureDebut = formData.get("heureDebut") || null;
  const heureFin = formData.get("heureFin") || null;

  if (!titre || !description || !date || !lieu || !type || !acces) {
    return NextResponse.json({ error: "Champs obligatoires manquants" }, { status: 400 });
  }

  let imageUrl = null;

  if (image && image.name) {
    if (!image.type.startsWith("image/")) {
      return NextResponse.json({ error: "Format d’image invalide" }, { status: 400 });
    }

    try {
      const buffer = Buffer.from(await image.arrayBuffer());
      const filename = `${Date.now()}_${image.name.replace(/\s/g, "_")}`;
      const uploadsDir = path.join(process.cwd(), "public/uploads");
      await fs.mkdir(uploadsDir, { recursive: true });

      const imagePath = path.join(uploadsDir, filename);
      await sharp(buffer).resize({ width: 800 }).toFile(imagePath);

      imageUrl = `/uploads/${filename}`;
    } catch (err) {
      console.error("Erreur traitement image :", err);
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
        createur: { connect: { id: user.id } },
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("❌ Erreur création événement :", err);
    return NextResponse.json({ error: "Erreur serveur", details: err.message }, { status: 500 });
  }
}

// 📤 GET — Liste des événements (pagination)
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

