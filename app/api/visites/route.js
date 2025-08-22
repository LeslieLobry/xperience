import { NextResponse } from "next/server";
import { getUserFromToken } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";

export async function POST(req) {
  try {
    const user = await getUserFromToken();
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const { visiteId } = await req.json();
    if (!visiteId) return NextResponse.json({ error: "ID cible manquant" }, { status: 400 });

    console.log("📥 VISITE reçue :", { visiteur: user.id, visite: visiteId });

    if (user.id === visiteId) {
      return NextResponse.json({ message: "Auto-visite ignorée" }, { status: 200 });
    }

    // Vérifie si déjà visité aujourd'hui
    const dejaVu = await prisma.visiteProfil.findFirst({
      where: {
        visiteurId: user.id,
        visiteId,
        date: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)), // début de journée
        },
      },
    });

    if (dejaVu) {
      return NextResponse.json({ message: "Déjà visité aujourd'hui" }, { status: 200 });
    }

    // Création de la visite
    const created = await prisma.visiteProfil.create({
      data: {
        visiteurId: user.id,
        visiteId,
      },
    });

    console.log("✅ Visite enregistrée :", created);

    // ✅ Ajout dans le digest (au lieu de notification immédiate)
    await prisma.digestNotification.create({
      data: {
        destinataireId: visiteId, // celui qui a été visité
        auteurId: user.id,        // celui qui visite
        visiteId: created.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Erreur enregistrement visite :", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
