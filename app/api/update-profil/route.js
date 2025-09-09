// app/api/upload-photo/route.js
import { NextResponse } from "next/server";
import { cookies as getCookies, headers as getHeaders } from "next/headers";
import jwt from "jsonwebtoken";
import { prisma } from "../../../lib/prisma";         // adapte si besoin
import { s3 } from "../../../lib/s3";                 // ton client S3 initialisé
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { isProfilComplet } from "../../../lib/isProfilComplet"; // si tu en as besoin ailleurs

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ——— CORS ———
const ALLOWED_ORIGINS = [
  "http://localhost:8081",   // Expo web
  "http://localhost:19006",  // Expo dev
  "https://www.x-periences.fr",
  "https://x-periences.fr",
];
function corsHeaders(origin = "") {
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : "https://www.x-periences.fr";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}
export async function OPTIONS() {
  const origin = (await getHeaders()).get("origin") || "";
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
}

// ——— Auth helpers ———
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("JWT_SECRET non défini");

function extractToken(reqHeaders) {
  // 1) Authorization: Bearer ...
  const auth = reqHeaders.get("authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (m?.[1]) return m[1];

  // 2) Cookie 'token=' (via next/headers cookies() si possible)
  try {
    const c = getCookies().get("token")?.value;
    if (c) return c;
  } catch {}

  // 3) Cookie header brut (fallback)
  const cookie = reqHeaders.get("cookie") || "";
  const pair = cookie.split(/;\s*/).find((x) => x.startsWith("token="));
  if (pair) return decodeURIComponent(pair.split("=")[1]);

  return null;
}

function safeNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function POST(req) {
  const reqHeaders = await getHeaders();
  const origin = reqHeaders.get("origin") || "";
  const headers = corsHeaders(origin);

  // — Auth (JSON, pas de redirect)
  const token = extractToken(reqHeaders);
  if (!token) {
    return NextResponse.json({ success: false, message: "Non autorisé" }, { status: 401, headers });
  }
  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch {
    return NextResponse.json({ success: false, message: "Token invalide" }, { status: 403, headers });
  }
  const userId = Number(decoded.id || decoded.sub);
  if (!userId) {
    return NextResponse.json({ success: false, message: "Token invalide" }, { status: 403, headers });
  }

  // — FormData (multipart)
  let formData, file, galerieId, isPublic;
  try {
    formData = await req.formData();
    // accepte "photo" OU "file"
    file = formData.get("photo") || formData.get("file");
    galerieId = formData.get("galerieId");
    isPublic = String(formData.get("isPublic") || "").toLowerCase() === "true";
  } catch {
    return NextResponse.json({ success: false, message: "FormData invalide" }, { status: 400, headers });
  }

  if (!file || typeof file === "string" || typeof file.arrayBuffer !== "function") {
    return NextResponse.json({ success: false, message: "Fichier invalide" }, { status: 400, headers });
  }

  // — Buffer
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const contentType = file.type || "application/octet-stream";
  const originalName = file.name || "upload.bin";

  // — Modération (Sightengine)
  try {
    const moderationForm = new FormData();
    moderationForm.append("media", new Blob([buffer], { type: contentType }), originalName);
    moderationForm.append("models", "face-attributes");
    moderationForm.append("api_user", process.env.SIGHTENGINE_USER || "");
    moderationForm.append("api_secret", process.env.SIGHTENGINE_SECRET || "");

    const moderationRes = await fetch("https://api.sightengine.com/1.0/check.json", {
      method: "POST",
      body: moderationForm,
    });
    const moderationData = await moderationRes.json();

    const faces = Array.isArray(moderationData?.faces) ? moderationData.faces : [];
    const hasMinor = faces.some((f) => (f?.attributes?.minor || 0) > 0.8); // seuil
    if (hasMinor) {
      return NextResponse.json(
        { success: false, message: "Photo refusée : une personne semble mineure." },
        { status: 400, headers }
      );
    }
  } catch (e) {
    console.error("Modération image échouée:", e);
    return NextResponse.json({ success: false, message: "Erreur analyse image." }, { status: 500, headers });
  }

  // — Upload S3
  const bucket = process.env.AWS_S3_BUCKET;
  if (!bucket) {
    return NextResponse.json({ success: false, message: "S3 non configuré" }, { status: 500, headers });
  }
  const safeName = String(originalName).replace(/[^\w.\-]/g, "_");
  const key = `photo_${userId}_${Date.now()}_${safeName}`;

  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        ACL: "private",
      })
    );
  } catch (e) {
    console.error("S3 upload error:", e);
    return NextResponse.json({ success: false, message: "Erreur upload" }, { status: 500, headers });
  }

  // — Persist DB (clé S3 uniquement)
  try {
    // Galerie privée ?
    if (galerieId && !Number.isNaN(Number(galerieId))) {
      const gal = await prisma.galeriePrivee.findUnique({ where: { id: Number(galerieId) } });
      if (!gal) {
        return NextResponse.json({ success: false, message: "Galerie privée introuvable." }, { status: 404, headers });
      }
      const photo = await prisma.photo.create({
        data: { url: key, utilisateurId: userId, galeriePriveeId: gal.id },
        select: { id: true, url: true, galeriePriveeId: true },
      });
      return NextResponse.json({ success: true, photoUrl: key, photo }, { headers });
    }

    // Galerie publique ?
    if (isPublic) {
      const photo = await prisma.photo.create({
        data: { url: key, utilisateurId: userId, galeriePriveeId: null },
        select: { id: true, url: true },
      });
      return NextResponse.json({ success: true, photoUrl: key, photo }, { headers });
    }

    // Photo de profil par défaut
    await prisma.utilisateur.update({
      where: { id: userId },
      data: { photoUrl: key },
    });
    return NextResponse.json({ success: true, photoUrl: key }, { headers });
  } catch (e) {
    console.error("DB error:", e);
    return NextResponse.json({ success: false, message: "Erreur serveur." }, { status: 500, headers });
  }
}
