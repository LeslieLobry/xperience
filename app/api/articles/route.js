// app/api/articles/route.js
import { prisma } from "../../../lib/prisma";
import { okJSON, errorJSON, preflight } from "../../../lib/cors";

export async function OPTIONS(req) {
  return preflight(req);
}

// GET — liste, ou 1 article via ?slug= / ?id=
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("slug");
    const idParam = searchParams.get("id");

    const include = {
      images: true,
      auteur: { select: { id: true, pseudo: true, photoUrl: true } },
    };

    // 1) Détail par slug
    if (slug) {
      const article = await prisma.article.findUnique({
        where: { slug }, // ⚠️ slug doit être @unique dans Prisma
        include,
      });
      if (!article) return errorJSON(req, { ok: false, error: "Not found" }, 404);
      return okJSON(req, { ok: true, article });
    }

    // 2) (optionnel) Détail par id
    if (idParam) {
      const id = Number(idParam);
      if (!Number.isFinite(id)) {
        return errorJSON(req, { ok: false, error: "id invalide" }, 400);
      }
      const article = await prisma.article.findUnique({ where: { id }, include });
      if (!article) return errorJSON(req, { ok: false, error: "Not found" }, 404);
      return okJSON(req, { ok: true, article });
    }

    // 3) Liste paginée
    const take = Number(searchParams.get("take") ?? 20);
    const skip = Number(searchParams.get("skip") ?? 0);

    const articles = await prisma.article.findMany({
      orderBy: { createdAt: "desc" },
      take,
      skip,
      include,
    });

    return okJSON(req, { ok: true, articles });
  } catch (err) {
    console.error("❌ Erreur GET /api/articles :", err);
    return errorJSON(req, { ok: false, error: "Erreur serveur" }, 500);
  }
}
