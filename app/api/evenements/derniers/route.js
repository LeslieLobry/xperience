import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function GET() {
  try {
    const evenements = await prisma.evenement.findMany({
orderBy: {
  // Trie par la première date du tableau (dates[0])
  dates: "desc"
}, // ← Si Prisma gère les arrays (sinon, tri côté JS)
take: 5,
select: {
  id: true,
  titre: true,
  imageUrl: true,
  dates: true, // ← On sélectionne tout le tableau de dates
  lieu: true,
},
    });
    return NextResponse.json({ evenements });
  } catch (err) {
    console.error("Erreur GET /api/evenements/derniers :", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    
  }
}
