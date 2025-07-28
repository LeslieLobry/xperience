import { prisma } from "../../../lib/prisma";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 10;
  const skip = (page - 1) * limit;

  // TODO : ajouter exclus si nécessaire, userId, etc.

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
      verificationIdentiteStatut: true
    },
  });

  return new Response(JSON.stringify(profils), { status: 200 });
}
