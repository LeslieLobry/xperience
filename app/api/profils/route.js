import { prisma } from "../../../lib/prisma";
import { okJSON, errorJSON, preflight } from "../../lib/cors";

export async function OPTIONS(req) {
  return preflight(req);
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = 10;
    const skip = (page - 1) * limit;

    const profils = await prisma.utilisateur.findMany({
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        pseudo: true,
        photoUrl: true,
        age: true,
        localisation: true,
        statut: true,
        type: true,
        verificationIdentiteStatut: true,
      },
    });

    return okJSON(req, { ok: true, profils, page });
  } catch (e) {
    console.error("Erreur API /profils:", e);
    return errorJSON(req, { ok: false, error: "Erreur serveur" }, 500);
  }
}
