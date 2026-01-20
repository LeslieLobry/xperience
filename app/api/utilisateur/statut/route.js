// app/api/utilisateur/statut/route.js
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "../../../../lib/prisma";

export const dynamic = "force-dynamic"; // évite que l'edge cache une réponse

const secret = process.env.JWT_SECRET;

// Helpers
function json(data, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
function isVercelScreenshot(req) {
  const ua = req.headers.get("user-agent") || "";
  return /vercel-screenshot/i.test(ua);
}

/* ======================= GET ======================= */
export async function GET(req) {
  try {
    if (isVercelScreenshot(req)) {
      return json(
        { auth: false, statut: "hors_ligne", source: "vercel-screenshot" },
        200
      );
    }

    const cookieStore = cookies();
    const token = cookieStore.get("token")?.value;

    if (!token || !secret) {
      return json({ auth: false, statut: "hors_ligne" }, 200);
    }

    let decoded;
    try {
      decoded = jwt.verify(token, secret);
    } catch {
      return json({ auth: false, statut: "hors_ligne" }, 200);
    }

    const utilisateur = await prisma.utilisateur.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        pseudo: true,
        role: true,
        emailVerified: true,
        statut: true, // ✅ visible/invisible
      },
    });

    if (!utilisateur) {
      return json({ auth: false, statut: "hors_ligne" }, 200);
    }

    return json({ auth: true, utilisateur }, 200);
  } catch (e) {
    console.error("GET /api/utilisateur/statut error:", e);
    return json({ error: "Erreur serveur" }, 500);
  }
}

/* ======================= POST ======================= */
export async function POST(req) {
  try {
    if (isVercelScreenshot(req)) {
      return json(
        { auth: false, statut: "hors_ligne", source: "vercel-screenshot" },
        200
      );
    }

    const cookieStore = cookies();
    const token = cookieStore.get("token")?.value;

    if (!token || !secret) {
      return json({ error: "Non authentifié" }, 401);
    }

    let decoded;
    try {
      decoded = jwt.verify(token, secret);
    } catch {
      return json({ error: "Token invalide" }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const { statut } = body || {};

    console.log("📩 POST statut (mode invisible) :", { statut });

    if (!statut || !["en_ligne", "hors_ligne"].includes(statut)) {
      return json({ error: "Statut invalide" }, 400);
    }

    await prisma.utilisateur.update({
      where: { id: decoded.id },
      data: { statut },
    });

    console.log("✅ Statut mis à jour :", statut);
    return json({ success: true, statut }, 200);
  } catch (error) {
    console.error("❌ Erreur POST /api/utilisateur/statut :", error);
    return json({ error: "Erreur serveur" }, 500);
  }
}
