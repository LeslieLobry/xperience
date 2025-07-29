import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUserFromToken } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";

export async function GET() {
  try {
    const cookieStore = cookies();
    const utilisateur = await getUserFromToken(cookieStore);

    if (!utilisateur?.id) {
      return NextResponse.json({ success: false, message: "Non autorisé" }, { status: 401 });
    }

    const existing = await prisma.verificationIdentite.findFirst({
      where: {
        utilisateurId: utilisateur.id,
        statut: {
          in: ["EN_ATTENTE", "ACCEPTEE"],
        },
      },
      select: {
        id: true,
        statut: true,
        createdAt: true,
      },
    });

    if (existing) {
      return NextResponse.json({
        success: true,
        aDejaDemande: true,
        statut: existing.statut,
      });
    }

    return NextResponse.json({
      success: true,
      aDejaDemande: false,
    });
  } catch (err) {
    console.error("Erreur GET statut vérification identité", err);
    return NextResponse.json(
      { success: false, message: "Erreur serveur" },
      { status: 500 }
    );
  }
}
