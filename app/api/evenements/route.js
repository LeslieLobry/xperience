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

  try {
    const [events, total] = await prisma.$transaction([
      prisma.evenement.findMany({
        skip,
        take: perPage,
        orderBy: { date: "asc" },
      }),
      prisma.evenement.count(),
    ]);

    return NextResponse.json({ events, total, page, perPage });
  } catch (err) {
    console.error("❌ Erreur GET /api/evenements :", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
