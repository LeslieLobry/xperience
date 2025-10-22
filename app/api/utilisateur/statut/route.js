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
    // 1) Laisse passer le bot vercel-screenshot avec une réponse neutre
    if (isVercelScreenshot(req)) {
      return json({ auth: false, statut: "hors_ligne", source: "vercel-screenshot" }, 200);
    }

    // 2) Lecture cookie (pas async)
    const cookieStore = cookies();
    const token = cookieStore.get("token")?.value;

    if (!token || !secret) {
      // Pas d'auth → 200 neutre (au lieu de 401)
      return json({ auth: false, statut: "hors_ligne" }, 200);
    }

    // 3) Vérif JWT
    let decoded;
    try {
      decoded = jwt.verify(token, secret);
    } catch {
      // Token invalide → 200 neutre (on évite d’exploser le front / bots)
      return json({ auth: false, statut: "hors_ligne" }, 200);
    }

    // 4) Fetch utilisateur
    const utilisateur = await prisma.utilisateur.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        pseudo: true,
        role: true,
        emailVerified: true,
        statut: true,
        statutAuto: true,
      },
    });

    if (!utilisateur) {
      // Pas trouvé → 200 neutre
      return json({ auth: false, statut: "hors_ligne" }, 200);
    }

    // 5) OK authentifié
    return json({ auth: true, utilisateur }, 200);
  } catch (e) {
    console.error("GET /api/utilisateur/statut error:", e);
    return json({ error: "Erreur serveur" }, 500);
  }
}

/* ======================= POST ======================= */
export async function POST(req) {
  try {
    // (Optionnel) ignorer le bot si jamais il POST (peu probable)
    if (isVercelScreenshot(req)) {
      return json({ auth: false, statut: "hors_ligne", source: "vercel-screenshot" }, 200);
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
    const { statut, statutAuto } = body || {};

    console.log("📩 Requête POST statut reçue :", { statut, statutAuto });

    if (statut && !["en_ligne", "hors_ligne"].includes(statut)) {
      return json({ error: "Statut invalide" }, 400);
    }

    const utilisateur = await prisma.utilisateur.findUnique({
      where: { id: decoded.id },
      select: { statutAuto: true },
    });

    if (!utilisateur) {
      return json({ error: "Utilisateur introuvable" }, 404);
    }

    const dataToUpdate = {};

    // Si on bascule le mode auto manuellement
    if (typeof statutAuto === "boolean") {
      dataToUpdate.statutAuto = statutAuto;
      if (statut) dataToUpdate.statut = statut;
      console.log("🎛️ Changement manuel :", dataToUpdate);
    }
    // Si on pousse un statut en mode auto (maj autorisée)
    else if (typeof statut === "string" && utilisateur.statutAuto === true) {
      dataToUpdate.statut = statut;
      console.log("🔁 Changement automatique :", dataToUpdate);
    }

    if (Object.keys(dataToUpdate).length > 0) {
      await prisma.utilisateur.update({
        where: { id: decoded.id },
        data: dataToUpdate,
      });
      console.log("✅ Mise à jour réussie");
    } else {
      console.log("⏭️ Aucune mise à jour effectuée (conditions non remplies)");
    }

    return json({ success: true }, 200);
  } catch (error) {
    console.error("❌ Erreur POST /api/utilisateur/statut :", error);
    return json({ error: "Erreur serveur" }, 500);
  }
}
