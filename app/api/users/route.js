import { prisma } from "../../../lib/prisma";

export async function GET() {
  try {
    const users = await prisma.utilisateur.findMany({
      include: { recherches: true },
    });

    return Response.json({ success: true, users });
  } catch (err) {
    console.error("Erreur API GET /users :", err);
    return Response.json({ success: false, message: "Erreur serveur" }, { status: 500 });
  }
}
