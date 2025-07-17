import { prisma } from "../../../lib/prisma";
import { getUserFromToken } from "../../../lib/auth"; // <-- à adapter à ton projet
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    const currentUser = await getUserFromToken(); // récupère l'utilisateur courant (depuis le cookie JWT)
    if (!currentUser) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const utilisateurs = await prisma.utilisateur.findMany({
      where: {
        id: { not: currentUser.id }, // <-- exclut l'utilisateur courant
      },
      select: {
        id: true,
        pseudo: true,
        photoUrl: true,
      },
      orderBy: { pseudo: "asc" },
    });

    return NextResponse.json({ utilisateurs });
  } catch (err) {
    console.error("❌ Erreur chargement utilisateurs :", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
