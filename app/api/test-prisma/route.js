import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma"; // adapte le chemin si besoin

export async function GET() {
  try {
    const user = await prisma.utilisateur.findFirst(); // 👈 si `utilisateur` est bien reconnu, ça marche
    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error("❌ Erreur test Prisma :", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
