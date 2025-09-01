// app/api/evenements/route.js
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "../../../lib/prisma";
import jwt from "jsonwebtoken";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { randomUUID } from "crypto";

// 🔹 CORS helpers
import { okJSON, errorJSON, preflight } from "../../../lib/cors";

// (optionnel) éviter le cache de route
export const dynamic = "force-dynamic";

// ─── AWS S3 ───────────────────────────────────────────────────────────────────
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
const BUCKET = process.env.AWS_S3_BUCKET;

const JWT_SECRET = process.env.JWT_SECRET;

// ─── Auth depuis cookie JWT ───────────────────────────────────────────────────
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

// ─── OPTIONS (préflight CORS) ────────────────────────────────────────────────
export async function OPTIONS(req) {
  return preflight(req);
}

// ─── POST: créer un événement ────────────────────────────────────────────────
export async function POST(req) {
  const user = await getUserFromCookie();
  if (!user || user.role !== "ADMIN") {
    return errorJSON(req, { error: "Accès interdit" }, 403);
  }

  const formData = await req.formData();

  const titre = formData.get("titre");
  const description = formData.get("description");
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

  // Dates (1..n)
  let dates = formData.getAll("dates");
  if (!dates.length && formData.get("date")) dates = [formData.get("date")];
  dates = dates
    .filter(Boolean)
    .flatMap((d) => (typeof d === "string" && d.includes(",") ? d.split(",").map((s) => s.trim()) : [d]));

  if (!titre || !description || !lieu || !type || !acces || !dates.length) {
    return errorJSON(req, { error: "Champs obligatoires manquants" }, 400);
  }

  const parsedDates = dates
    .map((d) => {
      const dt = new Date(d);
      return isNaN(dt) ? null : dt;
    })
    .filter(Boolean);

  if (!parsedDates.length) {
    return errorJSON(req, { error: "Aucune date valide transmise" }, 400);
  }

  // Image → S3 (clé stockée en BDD)
  let imageKey = null;
  const image = formData.get("image");
  if (image && image.name) {
    if (!image.type?.startsWith?.("image/")) {
      return errorJSON(req, { error: "Format d’image invalide" }, 400);
    }
    try {
      const buffer = Buffer.from(await image.arrayBuffer());
      const webpBuffer = await sharp(buffer).resize(800).webp({ quality: 80 }).toBuffer();

      const fileName = `evenements/${randomUUID()}.webp`;

      await s3.send(
        new PutObjectCommand({
          Bucket: BUCKET,
          Key: fileName,
          Body: webpBuffer,
          ContentType: "image/webp",
        })
      );

      imageKey = fileName; // on stocke la clé S3
    } catch (err) {
      console.error("Erreur upload S3 :", err);
      return errorJSON(req, { error: "Erreur lors du traitement de l’image" }, 500);
    }
  }

  try {
    await prisma.evenement.create({
      data: {
        titre,
        description,
        dates: parsedDates,
        lieu,
        type,
        acces,
        heureDebut,
        heureFin,
        tarifCouple,
        tarifFemme,
        tarifHomme,
        imageUrl: imageKey,
        latitude,
        longitude,
        lien,
        createur: { connect: { id: user.id } },
      },
    });

    return okJSON(req, { success: true });
  } catch (err) {
    console.error("❌ Erreur création événement :", err);
    return errorJSON(req, { error: "Erreur serveur", details: err.message }, 500);
  }
}

// ─── GET: lister les événements ──────────────────────────────────────────────
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
      where: { acces: acces.length ? { in: acces } : undefined },
      include: { participants: { select: { id: true } } },
    });

    const now = new Date();
    evenements = evenements.filter(
      (evt) => Array.isArray(evt.dates) && evt.dates.some((d) => new Date(d) >= now)
    );

    // Filtre par plage de dates
    if (dateDebut || dateFin) {
      evenements = evenements.filter((evt) =>
        evt.dates.some((d) => {
          const dt = new Date(d);
          const okDebut = dateDebut ? dt >= new Date(dateDebut) : true;
          const okFin = dateFin ? dt <= new Date(dateFin) : true;
          return okDebut && okFin;
        })
      );
    }

    // Filtre géographique (Haversine)
    if (!isNaN(latitude) && !isNaN(longitude)) {
      const toRad = (deg) => (deg * Math.PI) / 180;
      const R = 6371; // km
      evenements = evenements.filter((e) => {
        if (e.latitude == null || e.longitude == null) return false;
        const dLat = toRad(e.latitude - latitude);
        const dLon = toRad(e.longitude - longitude);
        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos(toRad(latitude)) * Math.cos(toRad(e.latitude)) * Math.sin(dLon / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;
        return distance <= rayon;
      });
    }

    // Tri par date la plus proche
    evenements.sort((a, b) => new Date(a.dates[0] || 0) - new Date(b.dates[0] || 0));

    const total = evenements.length;
    const paginated = evenements.slice(skip, skip + perPage);

    return okJSON(req, { events: paginated, total, page, perPage });
  } catch (err) {
    console.error("❌ Erreur GET /api/evenements :", err);
    return errorJSON(req, { error: "Erreur serveur" }, 500);
  }
}
