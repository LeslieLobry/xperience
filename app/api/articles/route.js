// app/api/articles/route.js
import { prisma } from "../../../lib/prisma";
import { okJSON, errorJSON, preflight } from "../../../lib/cors";

// Réponse au préflight CORS
export async function OPTIONS(req) {
  return preflight(req);
}

// GET — Récupérer les articles
export async function GET(req) {
  try {
    const articles = await prisma.article.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        images: true,
        auteur: {
          select: {
            id: true,
            pseudo: true,
            photoUrl: true,
          },
        },
      },
    });

    return okJSON(req, { ok: true, articles });
  } catch (err) {
    console.error("❌ Erreur GET /api/articles :", err);
    return errorJSON(req, { ok: false, error: "Erreur serveur" }, 500);
  }
}
