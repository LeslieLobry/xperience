// app/api/admin/utilisateurs/route.js
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getUserFromToken } from "../../../../lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const user = await getUserFromToken();

  if (!user || user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Accès interdit" },
      { status: 403 }
    );
  }

  try {
    const utilisateurs = await prisma.utilisateur.findMany({
      select: {
        id: true,
        pseudo: true,
        email: true,
        type: true,       // ✅ AJOUT ICI
        role: true,
        createdAt: true,
        lastLogin: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(utilisateurs);
  } catch (error) {
    console.error("Erreur récupération utilisateurs:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}