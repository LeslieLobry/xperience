import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export async function GET() {
  try {
    const partenaires = await prisma.partenaire.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(partenaires);
  } catch (error) {
    console.error("❌ Erreur Prisma :", error);
    return NextResponse.json({ error: error.message || "Erreur serveur" }, { status: 500 });
  }
}
